import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";

/**
 * HTTP for scraper adapters: identifies the bot, times out, retries transient failures
 * (429, 5xx, network) with backoff and honours Retry-After. Polite by default: one
 * request at a time per adapter, the caller decides pacing.
 */

const BOT_UA = "Mozilla/5.0 (compatible; con-vet.ru aggregator; +https://con-vet.ru; mailto:info@con-vet.ru)";

export interface FetchTextOptions {
  accept?: string;
  timeoutMs?: number;
  retries?: number;
  /** Some publishers block bot user agents on landing pages */
  browserUA?: boolean;
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_REDIRECTS = 5;

/** Loopback, private, link-local (cloud metadata), CGNAT, multicast and reserved ranges */
function isPrivateAddress(address: string): boolean {
  if (address.includes(":")) {
    const a = address.toLowerCase();
    if (a === "::1" || a === "::" || a.startsWith("fe8") || a.startsWith("fe9") || a.startsWith("fea") || a.startsWith("feb") || a.startsWith("fc") || a.startsWith("fd")) return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

/**
 * URLs come from feeds and APIs we do not control: only public http(s) hosts may be fetched,
 * checked after DNS resolution and again on every redirect hop (SSRF).
 */
async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`Blocked URL scheme: ${url.protocol}`);
  if (url.username || url.password) throw new Error("Blocked URL with credentials");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) throw new Error(`Blocked host: ${host}`);
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error(`Blocked private address for ${host}`);
  return url;
}

export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const { accept = "*/*", timeoutMs = 30_000, retries = 2, browserUA = false } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const signal = AbortSignal.timeout(timeoutMs);
      let current = (await assertPublicUrl(url)).toString();
      let response: Response | null = null;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        response = await fetch(current, {
          headers: { "User-Agent": browserUA ? BROWSER_UA : BOT_UA, Accept: accept },
          signal,
          redirect: "manual",
        });
        const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
        if (!location) break;
        if (hop === MAX_REDIRECTS) throw new Error(`HTTP too many redirects for ${url}`);
        current = (await assertPublicUrl(new URL(location, current).toString())).toString();
      }
      if (!response) throw new Error(`Request failed: ${url}`);
      if (response.ok) return await response.text();
      const transient = response.status === 429 || response.status >= 500;
      if (!transient || attempt === retries) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 2000 * 2 ** attempt);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && (error.message.startsWith("HTTP ") || error.message.startsWith("Blocked"))) throw error;
      if (attempt === retries) break;
      await sleep(2000 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Request failed: ${url}`);
}

/**
 * Plain text from HTML/JATS/XML fragments. Parsed with cheerio (entities decoded by the
 * parser, then text extracted), so decoded «&lt;script&gt;» can never become markup.
 * The result is untrusted text: render it escaped.
 */
export function toPlainText(value: string | null | undefined): string {
  if (!value) return "";
  // A space before every tag keeps words apart across <br>, </p><p> and JATS elements
  const $ = cheerio.load(`<root>${value.replace(/</g, " <")}</root>`, { xmlMode: true, decodeEntities: true } as cheerio.CheerioOptions);
  $("jats\\:title, title").remove(); // «Abstract» heading inside JATS
  return $("root").text().replace(/\s+/g, " ").trim();
}

/** Errata, retractions and editorial notes: not material for an article */
export function isNoticeTitle(title: string): boolean {
  return /^(correction|corrigendum|erratum|retraction|retracted|expression of concern|editorial board|reviewers? acknowledg|acknowledg(e)?ment to reviewers|исправлени|опровержени|ретракци)/i.test(
    title.trim()
  );
}

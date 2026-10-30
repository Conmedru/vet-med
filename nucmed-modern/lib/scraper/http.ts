import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
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

// Non-public ranges, checked on parsed addresses (no string matching). IPv4-mapped,
// IPv4-compatible, NAT64 and 6to4 IPv6 addresses are reduced to their IPv4 first.
const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) BLOCKED.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32], ["100::", 64],
] as const) BLOCKED.addSubnet(net, prefix, "ipv6");

/** IPv4 embedded in an IPv6 address (::ffff:a.b.c.d, ::a.b.c.d, 64:ff9b::/96, 2002::/16), else null */
function embeddedIPv4(address: string): string | null {
  const words = expandIPv6(address);
  if (!words) return null;
  const v4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  const zero = (from: number, to: number) => words.slice(from, to).every((w) => w === 0);
  if (zero(0, 5) && (words[5] === 0xffff || words[5] === 0)) return v4(words[6], words[7]); // mapped / compatible
  if (words[0] === 0x64 && words[1] === 0xff9b && zero(2, 6)) return v4(words[6], words[7]); // NAT64
  if (words[0] === 0x2002) return v4(words[1], words[2]); // 6to4
  return null;
}

function expandIPv6(address: string): number[] | null {
  let a = address.toLowerCase().split("%")[0];
  const dotted = a.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const parts = dotted[1].split(".").map(Number);
    a = a.slice(0, -dotted[1].length) + ((parts[0] << 8) | parts[1]).toString(16) + ":" + ((parts[2] << 8) | parts[3]).toString(16);
  }
  const [head, tail] = a.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  if (tail === undefined && h.length !== 8) return null;
  const words = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t].map((w) => parseInt(w, 16));
  return words.length === 8 && words.every((w) => Number.isInteger(w) && w >= 0 && w <= 0xffff) ? words : null;
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return BLOCKED.check(address, "ipv4");
  if (family === 6) {
    const v4 = embeddedIPv4(address);
    if (v4) return BLOCKED.check(v4, "ipv4");
    return BLOCKED.check(address, "ipv6");
  }
  return true; // not an IP: never connect
}

/**
 * The socket connects only to an address checked here (no second DNS lookup between the
 * check and the connection — DNS rebinding).
 */
const safeAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, { all: true }, (error, addresses) => {
        if (error) return callback(error, "", 0);
        const list = addresses as LookupAddress[];
        const blocked = list.find((a) => isPrivateAddress(a.address));
        if (!list.length || blocked) return callback(new Error(`Blocked private address for ${hostname}`), "", 0);
        if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
        callback(null, list[0].address, list[0].family);
      });
    },
  },
});

/** Scheme, credentials, host names and literal IPs; resolved names are checked in safeAgent */
function assertPublicUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`Blocked URL scheme: ${url.protocol}`);
  if (url.username || url.password) throw new Error("Blocked URL with credentials");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) throw new Error(`Blocked host: ${host}`);
  if (isIP(host) && isPrivateAddress(host)) throw new Error(`Blocked private address for ${host}`);
  return url;
}

export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const { accept = "*/*", timeoutMs = 30_000, retries = 2, browserUA = false } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const signal = AbortSignal.timeout(timeoutMs);
      let current = assertPublicUrl(url).toString();
      let response: Response | null = null;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        response = (await undiciFetch(current, {
          headers: { "User-Agent": browserUA ? BROWSER_UA : BOT_UA, Accept: accept },
          signal,
          redirect: "manual",
          dispatcher: safeAgent,
        })) as unknown as Response;
        const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
        if (!location) break;
        if (hop === MAX_REDIRECTS) throw new Error(`HTTP too many redirects for ${url}`);
        current = assertPublicUrl(new URL(location, current).toString()).toString();
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
      const blocked = (e: unknown): boolean => e instanceof Error && (e.message.startsWith("Blocked") || blocked((e as { cause?: unknown }).cause));
      if (error instanceof Error && (error.message.startsWith("HTTP ") || blocked(error))) throw error;
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
  // xmlMode knows only the XML entities; &nbsp; (HTML pages) becomes a plain space
  const $ = cheerio.load(`<root>${value.replace(/</g, " <").replace(/&nbsp;/gi, " ")}</root>`, { xmlMode: true, decodeEntities: true } as cheerio.CheerioOptions);
  $("jats\\:title, title").remove(); // «Abstract» heading inside JATS
  return $("root").text().replace(/[\s\u00a0]+/g, " ").trim();
}

/** Errata, retractions and editorial notes: not material for an article */
export function isNoticeTitle(title: string): boolean {
  return /^(correction|corrigendum|erratum|retraction|retracted|expression of concern|editorial board|reviewers? acknowledg|acknowledg(e)?ment to reviewers|исправлени|опровержени|ретракци)/i.test(
    title.trim()
  );
}

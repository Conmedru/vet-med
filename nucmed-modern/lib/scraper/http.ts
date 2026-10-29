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

export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const { accept = "*/*", timeoutMs = 30_000, retries = 2, browserUA = false } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": browserUA ? BROWSER_UA : BOT_UA, Accept: accept },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });
      if (response.ok) return await response.text();
      const transient = response.status === 429 || response.status >= 500;
      if (!transient || attempt === retries) {
        throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 60) * 1000 : 2000 * 2 ** attempt);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.startsWith("HTTP ")) throw error;
      if (attempt === retries) break;
      await sleep(2000 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Request failed: ${url}`);
}

/** Plain text from HTML/JATS/XML fragments: tags removed, entities decoded, whitespace collapsed */
export function toPlainText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<jats:title>[^<]*<\/jats:title>/gi, " ") // «Abstract» heading inside JATS
    .replace(/<\/?[a-zA-Z][^<>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Errata, retractions and editorial notes: not material for an article */
export function isNoticeTitle(title: string): boolean {
  return /^(correction|corrigendum|erratum|retraction|retracted|expression of concern|editorial board|reviewers? acknowledg|acknowledg(e)?ment to reviewers|исправлени|опровержени|ретракци)/i.test(
    title.trim()
  );
}

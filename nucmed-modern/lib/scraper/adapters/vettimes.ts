import * as cheerio from "cheerio";
import { BaseAdapter, ScrapedArticle } from "../types";
import { fetchText, toPlainText } from "../http";

const SITE = "https://www.vettimes.com";
/** Hub pages rendered on the server with the latest items and their dates (sub-sections render in the browser) */
const HUBS = ["/clinical", "/news/vets"];
const DEFAULT_SECTIONS = ["clinical/small-animal", "clinical/exotics", "news/vets/small-animal-vets", "news/vets/exotic"];
const DATE_RE = /\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (20\d\d)\b/;
/** Obituaries, event and podcast announcements: not clinical material for the portal */
const NOT_CLINICAL_TITLE = /\b(tributes?|obituary|dies|died|funeral|seminar|webinar|congress told|dates set|join us|podcast|awards?|appointed)\b/i;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Vet Times (vettimes.com) — UK news and clinical CPD articles for vets. No RSS; the sitemap
 * has no dates. The /clinical and /news/vets hubs list the latest items with dates; full
 * text is open on the article page. Advertorials (labelled on the page), obituaries and event or
 * podcast announcements are skipped.
 *
 * adapterConfig: { sections?: ["clinical/small-animal", …], maxAgeDays?: 14 }
 */
export class VetTimesAdapter extends BaseAdapter {
  async scrape(): Promise<ScrapedArticle[]> {
    const sections = Array.isArray(this.config.adapterConfig.sections)
      ? (this.config.adapterConfig.sections as string[])
      : DEFAULT_SECTIONS;
    const maxAgeDays = Number(this.config.adapterConfig.maxAgeDays) || 14;
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    const links = new Map<string, Date>();
    for (const hub of HUBS) {
      for (const item of hubItems(await fetchText(`${SITE}${hub}`, { accept: "text/html" }))) {
        const section = item.path.split("/").slice(1, -1).join("/");
        if (sections.includes(section) && item.date.getTime() >= cutoff && !links.has(item.path)) links.set(item.path, item.date);
      }
    }

    const articles: ScrapedArticle[] = [];
    for (const [path, listedAt] of links) {
      try {
        const article = parseArticle(await fetchText(`${SITE}${path}`, { accept: "text/html" }));
        if (!article) {
          console.log(`[VetTimes] Skipped (advertorial or no text): ${path}`);
        } else if (NOT_CLINICAL_TITLE.test(article.title)) {
          console.log(`[VetTimes] Skipped (not clinical): ${article.title}`);
        } else {
          articles.push({
            externalId: `vettimes:${path}`,
            externalUrl: `${SITE}${path}`,
            title: article.title,
            content: article.text,
            excerpt: article.lead || article.text.slice(0, 500),
            publishedAt: article.date ?? listedAt,
            authors: article.authors,
            images: [],
            metadata: { via: "vettimes", section: path.split("/").slice(1, -1).join("/") },
          });
        }
      } catch (error) {
        console.warn(`[VetTimes] ${path} failed: ${error instanceof Error ? error.message : error}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    console.log(`[VetTimes] ${links.size} recent items in ${sections.join(", ")}, ${articles.length} articles`);
    return articles;
  }
}

function parseDate(text: string): Date | null {
  const m = text.match(DATE_RE);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), MONTHS.indexOf(m[2].slice(0, 3)), Number(m[1])));
}

/** Hub page → article paths with the date shown next to each (the link precedes its date) */
export function hubItems(html: string): { path: string; date: Date }[] {
  const $ = cheerio.load(html);
  const items: { path: string; date: Date }[] = [];
  let lastPath: string | null = null;
  $("a[href], p, span, div").each((_, el) => {
    const node = $(el);
    const href = node.attr("href");
    if (href) {
      const path = href.replace(/^https:\/\/www\.vettimes\.com/, "").split(/[?#]/)[0];
      // Articles are three levels deep (/clinical/small-animal/slug) or four (/news/vets/small-animal-vets/slug)
      if (/^\/(clinical\/[a-z-]+|news\/[a-z-]+\/[a-z-]+)\/[a-z0-9-]+$/.test(path)) lastPath = path;
      return;
    }
    if (node.children().length) return; // dates are leaf elements
    const date = parseDate(node.text().trim());
    if (date && lastPath && !items.some((i) => i.path === lastPath)) items.push({ path: lastPath, date });
  });
  return items;
}

/** Article page → title, lead, authors, date and body text; null for advertorials */
export function parseArticle(html: string): { title: string; lead: string; authors: string[]; date: Date | null; text: string } | null {
  const $ = cheerio.load(html);
  const main = $(".article-detail-page .main-container").first();
  if (!main.length) return null;
  if (main.find("h4").filter((_, el) => /^advertorial$/i.test($(el).text().trim())).length) return null;

  const title = toPlainText(main.find("h1").first().text());
  const lead = toPlainText(main.find("h1").first().nextAll("p").first().text());
  const authors = main
    .find(".author-info p")
    .map((_, el) => $(el).text().trim())
    .get()
    .flatMap((names) => names.split(/,| and /))
    .map((name) => name.trim())
    .filter(Boolean);
  const date = parseDate(main.text());

  const body = main.find(".main-dynamic-content").first().clone();
  body.find("script, style, figure, figcaption, img, .reference").remove();
  const text = [lead, toPlainText(body.html())].filter(Boolean).join("\n\n").slice(0, 16000);
  if (!title || text.length < 300) return null;
  return { title, lead, authors, date, text };
}

import * as cheerio from "cheerio";
import { BaseAdapter, ScrapedArticle } from "../types";
import { fetchText, toPlainText } from "../http";

const SITE = "https://cardiaceducationgroup.org";
const API = `${SITE}/wp-json/wp/v2`;
/** «Videos» category of the CEG resource list */
const RESOURCE_VIDEOS_CATEGORY = 359;
/** WordPress taxonomy «species» → our animal rubrics */
const SPECIES_RUBRICS: Record<number, string> = { 308: "dogs", 336: "cats" };

type WpItem = {
  id: number;
  date_gmt: string;
  link: string;
  title: { rendered: string };
  species?: number[];
  _embedded?: { "wp:featuredmedia"?: { source_url?: string }[] };
};

/**
 * Cardiac Education Group (cardiaceducationgroup.org) — WordPress of veterinary cardiologists.
 * The REST API lists items (bodies are rendered by Elementor, so text comes from the page).
 * The site's mod_security rejects browser-like user agents: only the default bot UA works.
 *
 * adapterConfig.mode:
 *   "cases" — clinical case studies. Each page is a quiz: the question blocks with every
 *     answer option (wrong ones included) are removed, only the case history, the correct
 *     answers, findings and discussion go to the model.
 *   "media" — videos, webinars and podcasts: link-out teasers (title, format, the public
 *     episode description when the hosting page has one). The text pipeline is not used
 *     for them (lib/ai/process-article.ts, media path).
 * adapterConfig.sinceDays (default 30): items created or modified within this window.
 */
export class CegAdapter extends BaseAdapter {
  async scrape(): Promise<ScrapedArticle[]> {
    const mode = this.config.adapterConfig.mode;
    const sinceDays = Number(this.config.adapterConfig.sinceDays) || 30;
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
    if (mode === "cases") return this.cases(since);
    if (mode === "media") return this.media(since);
    throw new Error(`CEG adapter: unknown mode ${String(mode)}`);
  }

  private async list(type: string, since: string, extra = ""): Promise<WpItem[]> {
    const url = `${API}/${type}?per_page=100&modified_after=${since}&_embed=wp:featuredmedia${extra}`;
    return JSON.parse(await fetchText(url, { accept: "application/json" })) as WpItem[];
  }

  private async cases(since: string): Promise<ScrapedArticle[]> {
    const items = await this.list("case-studies", since);
    const articles: ScrapedArticle[] = [];
    for (const item of items) {
      // «Leo Tutorial»: a how-to walkthrough of the quiz, not a case
      if (/tutorial/i.test(item.title.rendered)) continue;
      try {
        const text = caseText(await fetchText(item.link, { accept: "text/html" }));
        if (text.length < 300) {
          console.warn(`[CEG] Case without text: ${item.link}`);
          continue;
        }
        const species = (item.species ?? []).map((id) => SPECIES_RUBRICS[id]).filter(Boolean);
        articles.push({
          ...base(item),
          title: `Clinical case: ${toPlainText(item.title.rendered)}`,
          content: text,
          excerpt: text.slice(0, 500),
          metadata: { via: "ceg", kind: "case", species: species.join(",") },
        });
      } catch (error) {
        console.warn(`[CEG] Case ${item.link} failed: ${error instanceof Error ? error.message : error}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log(`[CEG] ${items.length} cases since ${since}, ${articles.length} with text`);
    return articles;
  }

  private async media(since: string): Promise<ScrapedArticle[]> {
    const [videos, resourceVideos, episodes] = await Promise.all([
      this.list("video-content", since),
      this.list("resources", since, `&resources_categories=${RESOURCE_VIDEOS_CATEGORY}`),
      this.list("podcast-webinar", since),
    ]);
    const articles: ScrapedArticle[] = [];

    for (const item of videos) {
      articles.push(teaser(item, { format: "Video case with self-assessment questions (CE credit)", url: item.link, host: "Cardiac Education Group" }));
    }

    // Short lectures: the pages behind the resource links are empty, the videos play on the «Explore» pages
    if (resourceVideos.length) {
      const explore = await Promise.all(["diagnosis", "treatment"].map(async (p) => ({ url: `${SITE}/explore/${p}/`, html: await fetchText(`${SITE}/explore/${p}/`, { accept: "text/html" }) })));
      for (const item of resourceVideos) {
        const title = toPlainText(item.title.rendered);
        const page = explore.find((p) => toPlainText(p.html).includes(title))?.url ?? explore[0].url;
        articles.push(teaser(item, { format: "Short video lecture", url: page, host: "Cardiac Education Group" }));
      }
    }

    // Webinars and podcasts are hosted elsewhere; the listing card holds the outbound link and the cover
    if (episodes.length) {
      const cards = episodeCards(await fetchText(`${SITE}/podcast-webinar/`, { accept: "text/html" }));
      for (const item of episodes) {
        const title = toPlainText(item.title.rendered);
        const card = cards.find((c) => c.title === title);
        if (!card?.url) {
          console.warn(`[CEG] No outbound link for «${title}»`);
          continue;
        }
        const description = await publicDescription(card.url);
        articles.push(
          teaser(item, {
            format: card.format === "Podcasts" ? "Podcast" : "Webinar",
            url: card.url,
            host: new URL(card.url).hostname.replace(/^www\./, ""),
            description,
            image: card.image,
          })
        );
      }
    }
    console.log(`[CEG] Media since ${since}: ${articles.length} items`);
    return articles;
  }
}

function base(item: WpItem): Omit<ScrapedArticle, "title" | "content" | "excerpt" | "metadata"> {
  const cover = item._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  return {
    externalId: `ceg:${item.id}`,
    externalUrl: item.link,
    publishedAt: new Date(`${item.date_gmt}Z`),
    authors: [],
    images: cover ? [{ url: cover, isCover: true }] : [],
  };
}

/** Link-out card: only what the source states — format, title, host, public description */
function teaser(
  item: WpItem,
  info: { format: string; url: string; host: string; description?: string; image?: string }
): ScrapedArticle {
  const title = toPlainText(item.title.rendered);
  const lines = [`Format: ${info.format}`, `Title: ${title}`];
  if (info.host === "Cardiac Education Group") {
    lines.push("Produced by: Cardiac Education Group (veterinary cardiologists)");
  } else {
    // CEG only recommends these episodes: the producer is the hosting platform
    lines.push(`Hosted by: ${info.host}`, "Recommended by: Cardiac Education Group (veterinary cardiologists)");
  }
  if (info.description) lines.push(`Description: ${info.description}`);
  const content = lines.join("\n");
  const item_ = base(item);
  return {
    ...item_,
    externalUrl: info.url,
    images: item_.images?.length ? item_.images : info.image ? [{ url: info.image, isCover: true }] : [],
    title,
    content,
    excerpt: info.description ?? null,
    metadata: { via: "ceg", kind: "media" },
  };
}

/** CE post-tests and certification forms: not part of the case */
const CASE_SKIP_SECTIONS = /^(post test|race certification)/i;
/** Same as the source budget of lib/ai/process-article.ts */
const CASE_MAX_CHARS = 16000;

/**
 * Case page → plain text by sections. Removed before extraction: quiz question blocks
 * (they list every answer option, wrong ones too), navigation buttons and image links.
 */
export function caseText(html: string): string {
  const $ = cheerio.load(html);
  const root = $(".pet-case").first();
  if (!root.length) return "";
  root.find(".question, button, script, style, form, video, img").remove();
  // Interface prompts and media links: «Please review…», «View…», «Click here…», «Watch echo #1»
  root
    .find("a, h4, strong, p")
    .filter((_, el) => {
      const text = $(el).text().trim();
      return text.length < 160 && /^(please review|view\b|click (here|to)\b|watch\b|let[’']s auscult)/i.test(text);
    })
    .remove();
  const parts: string[] = [];
  // Accordion: h3.accordion_head, then the section body up to the next head
  root.find("h3.accordion_head").each((_, el) => {
    const heading = $(el).text().replace(/\s+/g, " ").trim();
    if (CASE_SKIP_SECTIONS.test(heading)) return;
    const body = $(el)
      .nextUntil("h3.accordion_head")
      .toArray()
      .map((node) => toPlainText($.html(node)))
      .join(" ")
      .replace(/Your browser does not support HTML video\.?/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (body) parts.push(`${heading}\n${body}`);
  });
  return parts.join("\n\n").slice(0, CASE_MAX_CHARS);
}

/** Webinar/podcast cards of /podcast-webinar/: format label, title, first outbound link, cover */
function episodeCards(html: string): { title: string; format: string; url?: string; image?: string }[] {
  const $ = cheerio.load(html);
  const cards: { title: string; format: string; url?: string; image?: string }[] = [];
  $(".webinars_podcast_data").each((_, el) => {
    const section = $(el);
    const title = toPlainText(section.find("h2").first().text());
    if (!title) return;
    const url = section
      .find("a[href^='http']")
      .map((_, a) => $(a).attr("href"))
      .get()
      .find((href) => !href.includes("cardiaceducationgroup.org") && !href.includes("podcasts.apple.com"));
    // The cover sits in the preceding section of the same card
    const image = section.prev("section").find("img").first().attr("src");
    cards.push({ title, format: toPlainText(section.find("h3").first().text()), url, image });
  });
  return cards;
}

/**
 * og:description of a public episode page. Course platforms behind login or bot protection
 * give nothing, or their generic blurb — the same text as on the site's home page.
 */
async function publicDescription(url: string): Promise<string | undefined> {
  const description = async (page: string) => {
    const $ = cheerio.load(await fetchText(page, { accept: "text/html", timeoutMs: 20_000, retries: 0 }));
    return toPlainText($('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content"));
  };
  try {
    const text = await description(url);
    if (text.length < 60) return undefined;
    const generic = await description(new URL("/", url).toString()).catch(() => "");
    return text === generic ? undefined : text;
  } catch {
    return undefined;
  }
}

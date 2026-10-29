import * as cheerio from "cheerio";
import { BaseAdapter, ScrapedArticle } from "../types";
import { fetchText, isNoticeTitle, toPlainText } from "../http";

const CROSSREF_API = "https://api.crossref.org/journals";

type CrossrefWork = {
  DOI: string;
  type?: string;
  title?: string[];
  abstract?: string;
  author?: { given?: string; family?: string; name?: string }[];
  published?: { "date-parts"?: number[][] };
  created?: { "date-time"?: string };
  URL?: string;
};

/**
 * Crossref adapter: latest articles of one journal by ISSN from the Crossref REST API
 * (DOI registry — covers most scholarly journals, including those without RSS or DOAJ).
 *
 * Crossref often carries the abstract (JATS). When it does not, and abstractFromLandingPage
 * is on, the abstract is read from the article page meta tags (citation_abstract,
 * DC.description, og:description) — the same tags Google Scholar indexes.
 *
 * adapterConfig: { issn, rows?: 40, maxAgeDays?: 14, language?: 'en'|'ru', abstractFromLandingPage?: boolean }
 */
export class CrossrefAdapter extends BaseAdapter {
  async scrape(): Promise<ScrapedArticle[]> {
    const issn = this.config.adapterConfig.issn;
    if (typeof issn !== "string" || !issn) throw new Error("Crossref adapter requires adapterConfig.issn");
    const rows = Math.min(Number(this.config.adapterConfig.rows) || 40, 100);
    const maxAgeDays = Number(this.config.adapterConfig.maxAgeDays) || 14;
    const fromLanding = this.config.adapterConfig.abstractFromLandingPage === true;
    const since = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const url =
      `${CROSSREF_API}/${encodeURIComponent(issn)}/works?rows=${rows}` +
      `&filter=${encodeURIComponent(`from-created-date:${since},type:journal-article`)}` +
      `&sort=created&order=desc&select=DOI,type,title,abstract,author,published,created,URL`;
    console.log(`[Crossref] Fetching ${this.config.name} (ISSN ${issn}) since ${since}`);
    const data = JSON.parse(await fetchText(url, { accept: "application/json", timeoutMs: 45_000 })) as {
      message?: { items?: CrossrefWork[] };
    };
    const items = data.message?.items ?? [];

    const articles: ScrapedArticle[] = [];
    let landingFetches = 0;
    for (const item of items) {
      const title = toPlainText(item.title?.[0]);
      if (!title || isNoticeTitle(title)) continue;
      let abstract = toPlainText(item.abstract);
      // Only the DOI resolver: Crossref's URL field is publisher-supplied (SSRF); redirects are checked in fetchText
      const articleUrl = `https://doi.org/${encodeURIComponent(item.DOI).replace(/%2F/gi, "/")}`;

      // Landing pages: sequential, capped per run — publishers rate-limit scrapers
      if (abstract.length < 150 && fromLanding && landingFetches < 25) {
        landingFetches++;
        abstract = (await this.abstractFromLandingPage(articleUrl)) || abstract;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      // Без аннотации ИИ нечего обрабатывать — конвейер такую статью всё равно отклонит
      if (abstract.length < 150) continue;

      const parts = item.published?.["date-parts"]?.[0];
      const publishedAt = parts?.length
        ? new Date(Date.UTC(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1))
        : item.created?.["date-time"]
          ? new Date(item.created["date-time"])
          : null;

      articles.push({
        externalId: `doi:${item.DOI.toLowerCase()}`,
        externalUrl: `https://doi.org/${item.DOI}`,
        title,
        content: abstract,
        excerpt: abstract.slice(0, 500),
        publishedAt,
        authors: (item.author ?? [])
          .map((a) => a.name || [a.given, a.family].filter(Boolean).join(" "))
          .filter(Boolean),
        images: [],
        metadata: { doi: item.DOI, issn, via: "crossref" },
      });
    }
    console.log(`[Crossref] ${this.config.name}: ${items.length} works, ${articles.length} with abstract`);
    return articles;
  }

  private async abstractFromLandingPage(url: string): Promise<string> {
    try {
      const html = await fetchText(url, { accept: "text/html", timeoutMs: 25_000, retries: 1, browserUA: true });
      const $ = cheerio.load(html);
      const candidates = [
        $('meta[name="citation_abstract"]').attr("content"),
        $('meta[name="DC.Description"], meta[name="dc.description"], meta[name="DC.description"]').first().attr("content"),
        $('meta[name="description"]').attr("content"),
        $('meta[property="og:description"]').attr("content"),
      ]
        .map((value) => toPlainText(value))
        .filter((value) => value.length >= 150);
      // Journals without the meta tag render the abstract in a block (vetsci.org, OJS themes)
      if (!candidates.length) {
        for (const selector of [".article-abstract", '[data-section-name="Abstract"]', "section.abstract", "#abstract", ".abstract", ".item.abstract"]) {
          const text = toPlainText($(selector).first().html())
            .replace(/^(go to:\s*)?(abstract|аннотация|резюме)\s*:?\s*/i, "")
            .slice(0, 5000);
          if (text.length >= 150) {
            candidates.push(text);
            break;
          }
        }
      }
      // The longest candidate: «description» is often a one-line teaser
      return candidates.sort((a, b) => b.length - a.length)[0] ?? "";
    } catch (error) {
      console.warn(`[Crossref] Landing page abstract failed for ${url}: ${error instanceof Error ? error.message : error}`);
      return "";
    }
  }
}

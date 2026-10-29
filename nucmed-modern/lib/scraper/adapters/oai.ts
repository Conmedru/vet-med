import * as cheerio from "cheerio";
import { BaseAdapter, ScrapedArticle } from "../types";
import { fetchText, isNoticeTitle, toPlainText } from "../http";

/**
 * OAI-PMH adapter: the standard export protocol of OJS and its Russian fork (NEICON /jour):
 * ListRecords in Dublin Core since a date, with resumption tokens.
 * Russian journals give the title and abstract in Russian and English — `language` picks one.
 *
 * adapterConfig: { endpoint: "https://…/oai", maxAgeDays?: 30, language?: 'ru'|'en', set?: string, maxPages?: 5 }
 */
export class OaiAdapter extends BaseAdapter {
  async scrape(): Promise<ScrapedArticle[]> {
    const endpoint = this.config.adapterConfig.endpoint;
    if (typeof endpoint !== "string" || !/^https?:\/\//.test(endpoint)) throw new Error("OAI adapter requires adapterConfig.endpoint");
    const maxAgeDays = Number(this.config.adapterConfig.maxAgeDays) || 30;
    const maxPages = Number(this.config.adapterConfig.maxPages) || 5;
    const language = this.config.adapterConfig.language === "ru" ? "ru" : "en";
    const set = typeof this.config.adapterConfig.set === "string" ? this.config.adapterConfig.set : null;
    const since = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const articles: ScrapedArticle[] = [];
    let url: string | null =
      `${endpoint}?verb=ListRecords&metadataPrefix=oai_dc&from=${since}` + (set ? `&set=${encodeURIComponent(set)}` : "");
    for (let page = 0; url && page < maxPages; page++) {
      const xml: string = await fetchText(url, { accept: "text/xml", timeoutMs: 45_000 });
      const $ = cheerio.load(xml, { xmlMode: true });
      const error = $("error").attr("code");
      if (error === "noRecordsMatch") break;
      if (error) throw new Error(`OAI error ${error}: ${$("error").text().trim()}`);

      $("record").each((_, record) => {
        const r = $(record);
        if (r.find("header").attr("status") === "deleted") return;
        const dc = (tag: string) => r.find(`dc\\:${tag}`).toArray().map((el) => ({ text: toPlainText($(el).text()), lang: $(el).attr("xml:lang") || "" }));

        const title = pickLanguage(dc("title"), language);
        const abstract = pickLanguage(dc("description"), language, 150);
        if (!title || isNoticeTitle(title) || abstract.length < 150) return;

        const identifiers = dc("identifier").map((i) => i.text);
        const link = identifiers.find((i) => /^https?:\/\/.*\/article\/view\//.test(i)) || identifiers.find((i) => /^https?:\/\//.test(i));
        const doi = identifiers.find((i) => /^10\.\d{4,9}\//.test(i)) || identifiers.map((i) => i.match(/doi\.org\/(10\.\d{4,9}\/\S+)/)?.[1]).find(Boolean);
        const oaiId = r.find("header > identifier").text().trim();
        const dateText = dc("date").map((d) => d.text).find((d) => /^\d{4}-\d{2}-\d{2}/.test(d)) || r.find("header > datestamp").text().trim();

        articles.push({
          externalId: doi ? `doi:${doi.toLowerCase()}` : `oai:${oaiId}`,
          externalUrl: link || (doi ? `https://doi.org/${doi}` : this.config.url),
          title,
          content: abstract,
          excerpt: abstract.slice(0, 500),
          publishedAt: dateText ? new Date(dateText) : null,
          authors: [...new Set(dc("creator").map((c) => c.text).filter(Boolean))].slice(0, 30),
          images: [],
          metadata: { oaiId, doi, via: "oai" },
        });
      });

      const token = $("resumptionToken").text().trim();
      url = token ? `${endpoint}?verb=ListRecords&resumptionToken=${encodeURIComponent(token)}` : null;
    }
    console.log(`[OAI] ${this.config.name}: ${articles.length} records with abstract since ${since}`);
    return articles;
  }
}

const CYRILLIC = /[а-яё]/i;

/**
 * Value in the wanted language: by xml:lang when the journal sets it, else by script
 * (NEICON journals often omit xml:lang and just list RU then EN).
 */
function pickLanguage(values: { text: string; lang: string }[], language: "ru" | "en", minLength = 1): string {
  const usable = values.filter((v) => v.text.length >= minLength);
  const byLang = usable.find((v) => v.lang.toLowerCase().startsWith(language));
  if (byLang) return byLang.text;
  const share = (s: string) => (s.match(/[а-яё]/gi)?.length ?? 0) / Math.max(1, s.match(/[a-zа-яё]/gi)?.length ?? 0);
  const byScript = usable.find((v) => (language === "ru" ? CYRILLIC.test(v.text) && share(v.text) > 0.5 : share(v.text) < 0.2));
  return (byScript ?? usable[0])?.text ?? "";
}

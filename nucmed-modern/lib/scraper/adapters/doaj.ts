import { BaseAdapter, ScrapedArticle } from '../types';

const DOAJ_API = 'https://doaj.org/api/search/articles';

type DoajArticle = {
  id: string;
  created_date: string;
  bibjson: {
    title?: string;
    abstract?: string;
    year?: string;
    month?: string;
    keywords?: string[];
    author?: { name: string; affiliation?: string }[];
    identifier?: { id: string; type: string }[];
    link?: { type: string; url: string; content_type?: string }[];
    journal?: { title?: string; country?: string };
  };
};

type DoajResponse = {
  total: number;
  results: DoajArticle[];
};

/**
 * DOAJ adapter: fetches the latest articles of one journal by ISSN via the public DOAJ API.
 * Content is the abstract (DOAJ does not carry full text).
 *
 * adapterConfig: { issn: string, pageSize?: number }
 */
export class DoajAdapter extends BaseAdapter {
  async scrape(): Promise<ScrapedArticle[]> {
    const issn = this.config.adapterConfig.issn;
    if (typeof issn !== 'string' || !issn) {
      throw new Error('DOAJ adapter requires adapterConfig.issn');
    }
    const pageSize = Number(this.config.adapterConfig.pageSize) || 30;

    const url = `${DOAJ_API}/${encodeURIComponent(`issn:${issn}`)}?pageSize=${pageSize}&sort=${encodeURIComponent('created_date:desc')}`;
    console.log(`[DOAJ] Fetching ${this.config.name} (ISSN ${issn})`);

    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'con-vet.ru aggregator' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      throw new Error(`DOAJ API ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as DoajResponse;
    console.log(`[DOAJ] Found ${data.results.length} of ${data.total} articles for ${this.config.name}`);

    return data.results
      // Без аннотации ИИ нечего обрабатывать
      .filter((item) => item.bibjson.title && item.bibjson.abstract)
      .map((item) => {
        const { bibjson } = item;
        const doi = bibjson.identifier?.find((i) => i.type.toLowerCase() === 'doi')?.id;
        const fulltext = bibjson.link?.find((l) => l.type === 'fulltext')?.url;
        const abstract = bibjson.abstract!.trim();

        return {
          externalId: doi ? `doi:${doi.toLowerCase()}` : `doaj:${item.id}`,
          externalUrl: fulltext || (doi ? `https://doi.org/${doi}` : `https://doaj.org/article/${item.id}`),
          title: bibjson.title!.trim(),
          content: abstract,
          excerpt: abstract.substring(0, 500),
          publishedAt: item.created_date ? new Date(item.created_date) : null,
          authors: (bibjson.author || []).map((a) => a.name).filter(Boolean),
          images: [],
          metadata: {
            doajId: item.id,
            doi,
            keywords: bibjson.keywords || [],
            journal: bibjson.journal?.title,
            year: bibjson.year,
            month: bibjson.month,
          },
        };
      });
  }
}

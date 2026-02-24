export interface ScrapedImage {
  url: string;
  caption?: string;
  isCover?: boolean;
}

export interface ScrapedArticle {
  externalId: string;
  externalUrl: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  publishedAt: Date | null;
  authors: string[];
  images?: ScrapedImage[];
  metadata: Record<string, unknown>;
}

export interface SourceConfig {
  id: string;
  name: string;
  slug: string;
  url: string;
  adapterType: 'rss' | 'html' | 'playwright';
  adapterConfig: {
    feedUrl?: string;
    articleSelector?: string;
    titleSelector?: string;
    contentSelector?: string;
    dateSelector?: string;
    [key: string]: unknown;
  };
}

export interface IngestResult {
  sourceId: string;
  sourceName: string;
  totalFetched: number;
  newArticles: number;
  duplicates: number;
  errors: string[];
}

export abstract class BaseAdapter {
  protected config: SourceConfig;

  constructor(config: SourceConfig) {
    this.config = config;
  }

  abstract scrape(): Promise<ScrapedArticle[]>;
}

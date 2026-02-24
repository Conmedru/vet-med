import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { BaseAdapter, ScrapedArticle, ScrapedImage, SourceConfig } from '../types';

type CustomFeed = {
  title: string;
  description: string;
};

type CustomItem = {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  isoDate: string;
  creator?: string;
  'dc:creator'?: string;
  'dc:date'?: string;
  'dc:identifier'?: string;
  categories?: string[];
  enclosure?: {
    url: string;
    type?: string;
  };
  'media:content'?: {
    $: { url: string; medium?: string; type?: string };
  };
};

export class RSSAdapter extends BaseAdapter {
  private parser: Parser<CustomFeed, CustomItem>;

  constructor(config: SourceConfig) {
    super(config);
    this.parser = new Parser<CustomFeed, CustomItem>({
      customFields: {
        item: [
          ['dc:creator', 'creator'],
          ['dc:date', 'dcDate'],
          ['dc:identifier', 'dcIdentifier'],
          ['media:content', 'media:content'],
        ],
      },
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NucmedBot/1.0; +https://nuclear.ru)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });
  }

  async scrape(): Promise<ScrapedArticle[]> {
    const feedUrl = this.config.adapterConfig.feedUrl || this.config.url;

    console.log(`[RSS] Fetching feed: ${feedUrl}`);

    try {
      const feed = await this.parser.parseURL(feedUrl);

      console.log(`[RSS] Found ${feed.items.length} items in feed: ${feed.title || this.config.name}`);

      const articles: ScrapedArticle[] = feed.items.map((item) => {
        const externalId = item.guid || item.link || '';
        const publishedAt = item.isoDate
          ? new Date(item.isoDate)
          : item.pubDate
            ? new Date(item.pubDate)
            : null;

        // Extract authors from various RSS fields
        const authors: string[] = [];
        if (item.creator) {
          // Handle comma-separated author lists
          const authorList = item.creator.split(',').map(a => a.trim()).filter(Boolean);
          authors.push(...authorList);
        }

        // Extract images
        const images: ScrapedImage[] = [];

        // 1. Check enclosure
        if (item.enclosure?.url && item.enclosure.url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          images.push({
            url: item.enclosure.url,
            isCover: true,
          });
        }

        // 2. Check media:content
        if (item['media:content']?.$?.url) {
          const mediaUrl = item['media:content'].$.url;
          if (mediaUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
            // Only add if not duplicate
            if (!images.some(img => img.url === mediaUrl)) {
              images.push({
                url: mediaUrl,
                isCover: images.length === 0, // Cover if first
              });
            }
          }
        }

        // 3. Extract from content using cheerio
        if (item.content || item.contentSnippet) {
          const htmlContent = item.content || item.contentSnippet || '';
          const $ = cheerio.load(htmlContent);

          $('img').each((_, element) => {
            const src = $(element).attr('src');
            if (src && src.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) {
              // Avoid duplicates
              if (!images.some(img => img.url === src)) {
                images.push({
                  url: src,
                  isCover: images.length === 0, // First found image as cover
                  caption: $(element).attr('alt') || undefined,
                });
              }
            }
          });
        }

        return {
          externalId,
          externalUrl: item.link || '',
          title: item.title || 'Untitled',
          content: item.content || item.contentSnippet || null,
          excerpt: item.contentSnippet?.substring(0, 500) || null,
          publishedAt,
          authors,
          images,
          metadata: {
            guid: item.guid,
            categories: item.categories || [],
            dcIdentifier: item['dc:identifier'],
          },
        };
      });

      return articles;
    } catch (error: any) {
      console.warn(`[RSS] Standard parser failed for ${feedUrl}, trying fallback...`, error.message);
      try {
        return await this.parseWithCheerio(feedUrl);
      } catch (fallbackError) {
        console.error(`[RSS] Fallback parsing also failed for ${feedUrl}:`, fallbackError);
        throw error; // Throw original error
      }
    }
  }

  private async parseWithCheerio(url: string): Promise<ScrapedArticle[]> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NucmedBot/1.0; +https://nuclear.ru)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const articles: ScrapedArticle[] = [];

    $('item').each((_, el) => {
      const $item = $(el);
      const link = $item.find('link').text();
      const title = $item.find('title').text();
      const content = $item.find('content\\:encoded').text() || $item.find('description').text();
      const dateStr = $item.find('pubDate').text() || $item.find('dc\\:date').text();

      const publishedAt = dateStr ? new Date(dateStr) : null;

      // Images
      const images: ScrapedImage[] = [];
      const enclosure = $item.find('enclosure');
      if (enclosure.length && enclosure.attr('type')?.startsWith('image/')) {
        const src = enclosure.attr('url');
        if (src) images.push({ url: src, isCover: true });
      }

      // Media:content
      $item.find('media\\:content, media\\:thumbnail').each((_, media) => {
        const src = $(media).attr('url');
        if (src && !images.some(i => i.url === src)) {
          images.push({ url: src, isCover: images.length === 0 });
        }
      });

      // Try extraction from description if no images found
      if (images.length === 0 && content) {
        const $content = cheerio.load(content);
        $content('img').each((_, img) => {
          const src = $content(img).attr('src');
          if (src && !images.some(i => i.url === src)) {
            images.push({ url: src, isCover: images.length === 0 });
          }
        });
      }

      articles.push({
        externalId: $item.find('guid').text() || link,
        externalUrl: link,
        title: title || 'Untitled',
        content: content || null,
        excerpt: content?.replace(/<[^>]+>/g, '').substring(0, 300) || null,
        publishedAt,
        authors: [], // Hard to parse generically with cheerio without strict structure
        images,
        metadata: { adapter: 'rss-fallback' }
      });
    });

    console.log(`[RSS-Fallback] Found ${articles.length} items`);
    return articles;
  }
}

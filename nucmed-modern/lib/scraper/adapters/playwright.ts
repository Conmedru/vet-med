import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { BaseAdapter, ScrapedArticle, ScrapedImage, SourceConfig } from '../types';

export interface PlaywrightConfig {
  listUrl?: string;
  articleSelector: string;
  linkSelector: string;
  titleSelector: string;
  contentSelector: string;
  dateSelector?: string;
  authorSelector?: string;
  imageSelector?: string;
  excerptSelector?: string;
  waitForSelector?: string;
  maxArticles?: number;
  scrollToLoad?: boolean;
  listOnly?: boolean;
}

export class PlaywrightAdapter extends BaseAdapter {
  private browser: Browser | null = null;

  constructor(config: SourceConfig) {
    super(config);
  }

  private getConfig(): PlaywrightConfig {
    return {
      listUrl: this.config.adapterConfig.listUrl as string,
      articleSelector: this.config.adapterConfig.articleSelector as string || 'article',
      linkSelector: this.config.adapterConfig.linkSelector as string || 'a',
      titleSelector: this.config.adapterConfig.titleSelector as string || 'h1',
      contentSelector: this.config.adapterConfig.contentSelector as string || '.content',
      dateSelector: this.config.adapterConfig.dateSelector as string,
      authorSelector: this.config.adapterConfig.authorSelector as string,
      imageSelector: this.config.adapterConfig.imageSelector as string || 'img',
      excerptSelector: this.config.adapterConfig.excerptSelector as string,
      waitForSelector: this.config.adapterConfig.waitForSelector as string,
      maxArticles: (this.config.adapterConfig.maxArticles as number) || 10,
      scrollToLoad: this.config.adapterConfig.scrollToLoad as boolean || false,
      listOnly: this.config.adapterConfig.listOnly as boolean || false,
    };
  }

  async scrape(): Promise<ScrapedArticle[]> {
    const cfg = this.getConfig();
    const articles: ScrapedArticle[] = [];

    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      // Get article links from list page
      const listUrl = cfg.listUrl || this.config.url;
      console.log(`[Playwright] Fetching list page: ${listUrl}`);

      try {
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      } catch (e) {
        console.warn(`[Playwright] Navigation timeout/error for ${listUrl}, attempting to proceed anyway...`);
      }

      if (cfg.waitForSelector) {
        try {
          await page.waitForSelector(cfg.waitForSelector, { timeout: 15000 });
        } catch (e) {
          console.warn(`[Playwright] Selector ${cfg.waitForSelector} not found within timeout`);
        }
      }

      if (cfg.scrollToLoad) {
        await this.autoScroll(page);
      }

      const html = await page.content();
      const $ = cheerio.load(html);

      const articleLinks: string[] = [];
      $(cfg.articleSelector).each((_, el) => {
        let link: string | undefined;
        // Check if element is <a> tag
        if (cfg.linkSelector === 'self' && $(el).is('a')) {
          link = $(el).attr('href');
        } else if (cfg.linkSelector === 'self') {
          // If self is specified but element is not <a>, try to find closest <a> or check if it wraps one
          link = $(el).closest('a').attr('href') || $(el).find('a').first().attr('href');
        } else {
          link = $(el).find(cfg.linkSelector).attr('href');
        }

        if (link && articleLinks.length < (cfg.maxArticles || 10)) {
          const absoluteUrl = this.resolveUrl(link, listUrl);
          if (!articleLinks.includes(absoluteUrl)) {
            articleLinks.push(absoluteUrl);
          }
        }
      });

      console.log(`[Playwright] Found ${articleLinks.length} article links, listOnly=${cfg.listOnly}`);

      if (cfg.listOnly) {
        // Extract article data directly from the list page
        console.log(`[Playwright] listOnly mode — extracting from list page`);
        $(cfg.articleSelector).each((i, el) => {
          if (i >= (cfg.maxArticles || 10)) return;

          const $el = $(el);
          let link: string | undefined;
          if (cfg.linkSelector === 'self') {
            link = $el.is('a') ? $el.attr('href') : ($el.closest('a').attr('href') || $el.find('a').first().attr('href'));
          } else {
            link = $el.find(cfg.linkSelector).attr('href');
          }
          const absoluteUrl = link ? this.resolveUrl(link, listUrl) : '';

          const title = $el.find(cfg.titleSelector).first().text().trim();
          if (!title) return;

          let dateStr: string | null = null;
          if (cfg.dateSelector) {
            dateStr = $el.find(cfg.dateSelector).first().text().trim() || null;
          }

          const images: ScrapedImage[] = [];
          if (cfg.imageSelector) {
            $el.find(cfg.imageSelector).each((j, img) => {
              const src = $(img).attr('src') || $(img).attr('data-src');
              if (src && !src.includes('data:image') && !src.includes('.svg')) {
                images.push({
                  url: this.resolveUrl(src, listUrl),
                  caption: $(img).attr('alt') || undefined,
                  isCover: j === 0,
                });
              }
            });
          }

          articles.push({
            externalId: this.generateExternalId(absoluteUrl || `${listUrl}#${i}`),
            externalUrl: absoluteUrl,
            title,
            content: null,
            excerpt: title,
            publishedAt: dateStr ? this.parseDate(dateStr) : null,
            authors: [],
            images: images.length > 0 ? images : undefined,
            metadata: { adapter: 'playwright-listOnly' },
          });
        });
        console.log(`[Playwright] Extracted ${articles.length} articles from list page`);
      } else {
        // Scrape each article page individually
        for (const url of articleLinks) {
          try {
            const article = await this.scrapeArticle(page, url, cfg);
            if (article) {
              articles.push(article);
            }
            // Rate limiting between articles
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`[Playwright] Error scraping ${url}:`, error);
          }
        }
      }

      await context.close();
    } catch (error) {
      console.error('[Playwright] Scraping error:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }

    return articles;
  }

  private async scrapeArticle(
    page: Page,
    url: string,
    cfg: PlaywrightConfig
  ): Promise<ScrapedArticle | null> {
    console.log(`[Playwright] Scraping article: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    const title = $(cfg.titleSelector).first().text().trim();
    if (!title) {
      console.log(`[Playwright] No title found for ${url}`);
      return null;
    }

    const contentEl = $(cfg.contentSelector).first();
    const content = contentEl.length ? this.cleanContent(contentEl.html() || '') : null;

    let excerpt: string | null = null;
    if (cfg.excerptSelector) {
      excerpt = $(cfg.excerptSelector).first().text().trim() || null;
    }
    if (!excerpt && content) {
      excerpt = content.replace(/<[^>]+>/g, '').substring(0, 300).trim();
    }

    let publishedAt: Date | null = null;
    if (cfg.dateSelector) {
      const dateText = $(cfg.dateSelector).first().text().trim();
      if (dateText) {
        publishedAt = this.parseDate(dateText);
      }
    }

    const authors: string[] = [];
    if (cfg.authorSelector) {
      $(cfg.authorSelector).each((_, el) => {
        const author = $(el).text().trim();
        if (author && !authors.includes(author)) {
          authors.push(author);
        }
      });
    }

    const images: ScrapedImage[] = [];
    if (cfg.imageSelector) {
      $(cfg.imageSelector).each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.includes('data:image')) {
          images.push({
            url: this.resolveUrl(src, url),
            caption: $(el).attr('alt') || undefined,
            isCover: i === 0,
          });
        }
      });
    }

    return {
      externalId: this.generateExternalId(url),
      externalUrl: url,
      title,
      content,
      excerpt,
      publishedAt,
      authors,
      images: images.length > 0 ? images : undefined,
      metadata: {
        scrapedAt: new Date().toISOString(),
        adapter: 'playwright',
      },
    };
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const maxScrolls = 10;
        let scrollCount = 0;

        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, 300);
      });
    });

    // Wait for any lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private resolveUrl(url: string, base: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    try {
      return new URL(url, base).href;
    } catch {
      return url;
    }
  }

  private generateExternalId(url: string): string {
    // Use URL path as ID, cleaned up
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 100);
    } catch {
      return url.slice(0, 100);
    }
  }

  private cleanContent(html: string): string {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, aside, .ads, .advertisement, .social-share').remove();

    return $.html() || '';
  }

  private parseDate(dateStr: string): Date | null {
    try {
      // Try common formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }

      // Try Russian date format: "15 января 2024"
      const ruMonths: Record<string, number> = {
        'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
        'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
        'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11,
      };

      const ruMatch = dateStr.match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
      if (ruMatch) {
        const [, day, month, year] = ruMatch;
        const monthNum = ruMonths[month.toLowerCase()];
        if (monthNum !== undefined) {
          return new Date(parseInt(year), monthNum, parseInt(day));
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}

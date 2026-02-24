import { prisma } from "@/lib/prisma";
import { PlaywrightAdapter } from "./adapters/playwright";
import { RSSAdapter } from "./adapters/rss";
import type { BaseAdapter, ScrapedArticle, SourceConfig } from "./types";
import type { SourcePreviewRequestInput } from "@/lib/schemas/source";

function getAdapter(config: SourceConfig): BaseAdapter {
  switch (config.adapterType) {
    case "rss":
      return new RSSAdapter(config);
    case "playwright":
    case "html":
      return new PlaywrightAdapter(config);
    default:
      throw new Error(`Unknown adapter type: ${config.adapterType}`);
  }
}

function getConfigVersion(config: Record<string, unknown>): number {
  const raw = config.version;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  return 1;
}

function toPreviewItem(article: ScrapedArticle) {
  return {
    externalId: article.externalId,
    externalUrl: article.externalUrl,
    title: article.title,
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
    imageCount: article.images?.length || 0,
    hasCover: Boolean(article.images?.some((image) => image.isCover)),
  };
}

export async function previewSourceScrape(sourceId: string, input: SourcePreviewRequestInput) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    return null;
  }

  const adapterConfig = {
    ...(typeof source.adapterConfig === "object" && source.adapterConfig
      ? (source.adapterConfig as Record<string, unknown>)
      : {}),
    ...(input.adapterConfig || {}),
  };

  const adapterType = input.adapterType || (source.adapterType as SourceConfig["adapterType"]);

  const config: SourceConfig = {
    id: source.id,
    name: source.name,
    slug: source.slug,
    url: input.url || source.url,
    adapterType,
    adapterConfig,
  };

  const start = Date.now();
  const articles = await getAdapter(config).scrape();
  const durationMs = Date.now() - start;

  return {
    sourceId: source.id,
    sourceName: source.name,
    adapterType,
    configVersion: getConfigVersion(adapterConfig),
    durationMs,
    totalFetched: articles.length,
    sample: articles.slice(0, input.limit).map(toPreviewItem),
  };
}

import { prisma } from '@/lib/prisma';
import { ArticleStatus, Prisma } from '@prisma/client';
import { RSSAdapter } from './adapters/rss';
import { PlaywrightAdapter } from './adapters/playwright';
import { BaseAdapter, IngestResult, ScrapedArticle, SourceConfig } from './types';
import { embedImage } from '@/lib/ai/clip-embeddings';
import { storeArticleImage, isS3Configured } from '@/lib/storage';
import { generateSlug } from '@/lib/slug';
import { processAndGenerateCover } from '@/lib/ai/process-article';

async function logSourceRun(
  sourceId: string,
  success: boolean,
  metadata: Record<string, number | string | boolean>,
  errorMessage?: string
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      action: 'ingest.source_run',
      entityType: 'source',
      entityId: sourceId,
      actorType: 'system',
      success,
      errorMessage,
      metadata: metadata as Prisma.InputJsonValue,
    },
  }).catch((error) => {
    console.error('[Ingest] Failed to persist source run log:', error);
  });
}

function getAdapter(config: SourceConfig): BaseAdapter {
  switch (config.adapterType) {
    case 'rss':
      return new RSSAdapter(config);
    case 'playwright':
    case 'html':
      return new PlaywrightAdapter(config);
    default:
      throw new Error(`Unknown adapter type: ${config.adapterType}`);
  }
}

// Helper to ensure unique slug (handles race conditions with PgBouncer)
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (counter < 100) {
    const existing = await prisma.article.findUnique({
      where: { slug },
      select: { id: true }
    });
    
    if (!existing) return slug;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  // Fallback: append random suffix to guarantee uniqueness
  return `${baseSlug}-${Date.now().toString(36)}`;
}

export async function ingestSource(sourceId: string, options?: { autoProcess?: boolean }): Promise<IngestResult> {
  const autoProcess = options?.autoProcess ?? true;
  const startedAt = Date.now();
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  const config: SourceConfig = {
    id: source.id,
    name: source.name,
    slug: source.slug,
    url: source.url,
    adapterType: source.adapterType as 'rss' | 'html' | 'playwright',
    adapterConfig: source.adapterConfig as SourceConfig['adapterConfig'],
  };

  const adapter = getAdapter(config);
  const result: IngestResult = {
    sourceId: source.id,
    sourceName: source.name,
    totalFetched: 0,
    newArticles: 0,
    duplicates: 0,
    errors: [],
  };

  let articles: ScrapedArticle[] = [];

  try {
    articles = await adapter.scrape();
    result.totalFetched = articles.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scraping error';
    result.errors.push(`Scraping failed: ${message}`);
    console.error(`[Ingest] Error scraping ${source.name}:`, error);

    await logSourceRun(source.id, false, {
      sourceName: source.name,
      totalFetched: 0,
      newArticles: 0,
      duplicates: 0,
      errorsCount: result.errors.length,
      durationMs: Date.now() - startedAt,
    }, message);

    return result;
  }

  for (const article of articles) {
    try {
      // Check if article already exists (by source + externalId)
      const existing = await prisma.article.findUnique({
        where: {
          sourceId_externalId: {
            sourceId: source.id,
            externalId: article.externalId,
          },
        },
      });

      if (existing) {
        result.duplicates++;
        continue;
      }

      // Create new article with INGESTED status (retry on slug collision)
      const baseSlug = generateSlug(article.title);
      let createdArticle;
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = attempt === 0 
          ? await ensureUniqueSlug(baseSlug)
          : `${baseSlug}-${Date.now().toString(36)}`;
        try {
          createdArticle = await prisma.article.create({
            data: {
              sourceId: source.id,
              slug,
              externalId: article.externalId,
              externalUrl: article.externalUrl,
              titleOriginal: article.title,
              contentOriginal: article.content || '',
              excerptOriginal: article.excerpt,
              originalPublishedAt: article.publishedAt,
              authors: article.authors,
              status: ArticleStatus.INGESTED,
              language: 'en',
            },
          });
          break;
        } catch (slugError: any) {
          if (slugError?.code === 'P2002') {
            if (slugError?.meta?.target?.includes('slug') && attempt < 2) {
              console.warn(`[Ingest] Slug collision for "${baseSlug}", retrying...`);
              continue;
            }
            if (slugError?.meta?.target?.includes('externalId')) {
              // Duplicate article (PgBouncer read lag) — treat as duplicate
              result.duplicates++;
              break;
            }
          }
          throw slugError;
        }
      }
      if (!createdArticle) continue;

      // Process images
      if (article.images && article.images.length > 0) {
        const s3Enabled = isS3Configured();
        console.log(`[Ingest] Found ${article.images.length} images for article: ${article.title} (S3: ${s3Enabled})`);
        
        for (let i = 0; i < article.images.length; i++) {
          const img = article.images[i];
          try {
            // Use S3 storage service if configured, otherwise save URL only
            const result = await storeArticleImage(
              createdArticle.id,
              img.url,
              i,
              img.caption,
              img.isCover || false
            );

            // Trigger embedding generation in background (fire and forget)
            embedImage(result.id).catch(err => {
              console.error(`[Ingest] Failed to embed image ${result.id}:`, err);
            });
            
          } catch (imgError) {
            console.error(`[Ingest] Failed to save image ${img.url}:`, imgError);
          }
        }
      }

      result.newArticles++;
      (result as any)._newArticleIds = (result as any)._newArticleIds || [];
      (result as any)._newArticleIds.push(createdArticle.id);
      console.log(`[Ingest] New article: ${article.title.substring(0, 60)}...`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to save article "${article.title}": ${message}`);
      console.error(`[Ingest] Error saving article:`, error);
    }
  }

  // Update source lastScrapedAt
  await prisma.source.update({
    where: { id: source.id },
    data: { lastScrapedAt: new Date() },
  });

  console.log(
    `[Ingest] ${source.name}: ${result.newArticles} new, ${result.duplicates} duplicates, ${result.errors.length} errors`
  );

  // Auto-process new articles through AI pipeline
  const newArticleIds: string[] = (result as any)._newArticleIds || [];
  if (autoProcess && newArticleIds.length > 0) {
    console.log(`[Ingest] Auto-processing ${newArticleIds.length} new articles...`);
    for (const articleId of newArticleIds) {
      try {
        const processResult = await processAndGenerateCover(articleId, { generateCover: true });
        if (processResult.success) {
          console.log(`[Ingest] Processed: "${processResult.title?.substring(0, 50)}..."`);
        } else {
          console.warn(`[Ingest] Processing failed for ${articleId}: ${processResult.error}`);
        }
      } catch (processError) {
        console.error(`[Ingest] Processing error for ${articleId}:`, processError);
      }
      // Rate limit: 10s between AI calls to respect Replicate limits
      if (newArticleIds.indexOf(articleId) < newArticleIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10_000));
      }
    }
  }
  delete (result as any)._newArticleIds;

  await logSourceRun(source.id, result.errors.length === 0, {
    sourceName: source.name,
    totalFetched: result.totalFetched,
    newArticles: result.newArticles,
    duplicates: result.duplicates,
    errorsCount: result.errors.length,
    durationMs: Date.now() - startedAt,
  }, result.errors[0]);

  return result;
}

export async function ingestAllSources(): Promise<IngestResult[]> {
  const sources = await prisma.source.findMany({
    where: { isActive: true },
  });

  console.log(`[Ingest] Starting ingestion for ${sources.length} active sources`);

  const results: IngestResult[] = [];

  for (const source of sources) {
    try {
      const result = await ingestSource(source.id);
      results.push(result);
    } catch (error) {
      console.error(`[Ingest] Failed to ingest ${source.name}:`, error);
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        totalFetched: 0,
        newArticles: 0,
        duplicates: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  }

  const totalNew = results.reduce((sum, r) => sum + r.newArticles, 0);
  const totalDuplicates = results.reduce((sum, r) => sum + r.duplicates, 0);
  console.log(`[Ingest] Complete: ${totalNew} new articles, ${totalDuplicates} duplicates`);

  return results;
}

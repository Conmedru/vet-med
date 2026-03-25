import { ingestAllSources } from '../lib/scraper';
import { prisma } from '../lib/prisma';
import { processAndGenerateCover } from '../lib/ai/process-article';
import { ArticleStatus } from '@prisma/client';

async function main() {
  console.log('🚀 [Recovery] Starting Emergency Force Recovery...');

  // 1. Ingest all sources
  console.log('📡 [Recovery] Step 1: Scraping all active sources...');
  try {
    const ingestResults = await ingestAllSources();
    const totalNew = ingestResults.reduce((sum, r) => sum + r.newArticles, 0);
    console.log(`✅ [Recovery] Scrape complete. Found ${totalNew} new articles.`);
  } catch (error) {
    console.error('❌ [Recovery] Scrape failed:', error);
  }

  // 2. Process all INGESTED articles
  console.log('🧠 [Recovery] Step 2: Processing INGESTED articles (AI Translation/Summary)...');
  const ingestedArticles = await prisma.article.findMany({
    where: { status: ArticleStatus.INGESTED },
    select: { id: true, titleOriginal: true },
  });

  console.log(`📊 [Recovery] Found ${ingestedArticles.length} articles waiting for processing.`);

  for (const article of ingestedArticles) {
    console.log(`[Recovery] Processing [${article.id}] ${article.titleOriginal?.substring(0, 50)}...`);
    try {
      const result = await processAndGenerateCover(article.id, { generateCover: true });
      if (result.success) {
        console.log(`   ✅ Success: ${result.title?.substring(0, 50)}`);
      } else {
        console.warn(`   ⚠️ Failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${article.id}:`, error);
    }
    
    // Brief sleep to avoid hitting rate limits too hard
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 3. Publish Scheduled
  console.log('📅 [Recovery] Step 3: Publishing scheduled articles...');
  const now = new Date();
  const scheduled = await prisma.article.findMany({
    where: {
      status: ArticleStatus.SCHEDULED,
      scheduledAt: { lte: now },
    },
  });

  for (const article of scheduled) {
    await prisma.article.update({
      where: { id: article.id },
      data: {
        status: ArticleStatus.PUBLISHED,
        publishedAt: article.scheduledAt || now,
      },
    });
    console.log(`   ✅ Published: ${article.id}`);
  }

  console.log('🏁 [Recovery] Force Recovery Complete.');
}

main()
  .catch((e) => {
    console.error('💥 [Recovery] Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { prisma } from '../lib/prisma';
import { ArticleStatus } from '@prisma/client';

async function main() {
  console.log('📝 [Publish] Starting safe bulk publishing of drafts...');

  // Find drafts that have required fields for publishing
  const drafts = await prisma.article.findMany({
    where: {
      status: ArticleStatus.DRAFT,
      title: { not: null },
      content: { not: null },
      coverImageUrl: { not: null },
    },
  });

  console.log(`📊 [Publish] Found ${drafts.length} drafts ready for publishing.`);

  let successCount = 0;
  for (const article of drafts) {
    try {
      // Set publishedAt to originalPublishedAt if available, otherwise now
      const publishDate = article.originalPublishedAt || new Date();

      await prisma.article.update({
        where: { id: article.id },
        data: {
          status: ArticleStatus.PUBLISHED,
          publishedAt: publishDate,
        },
      });
      
      console.log(`   ✅ Published: ${article.title?.substring(0, 50)}...`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed to publish ${article.id}:`, error);
    }
  }

  console.log(`🏁 [Publish] Complete. ${successCount} articles published.`);
}

main()
  .catch((e) => {
    console.error('💥 [Publish] Fatal error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

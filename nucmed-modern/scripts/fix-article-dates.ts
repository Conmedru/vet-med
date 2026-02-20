import { prisma } from '../lib/prisma';

async function main() {
  console.log("Fixing publishedAt dates for testing...");
  
  // Update last 10 published articles to have publishedAt = now if it is null
  // actually let's just update them to roughly this week so they appear in the digest
  
  const articles = await prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    take: 10,
    orderBy: { createdAt: 'desc' } // assuming createdAt exists
  });

  const now = new Date();
  
  for (const article of articles) {
    if (!article.publishedAt) {
      console.log(`Updating ${article.id}...`);
      await prisma.article.update({
        where: { id: article.id },
        data: { publishedAt: now }
      });
    }
  }
  
  console.log("Done fixing dates.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

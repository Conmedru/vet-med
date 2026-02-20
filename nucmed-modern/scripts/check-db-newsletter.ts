import { prisma } from '../lib/prisma';

async function main() {
  console.log("Checking articles in database...");
  
  const count = await prisma.article.count();
  console.log(`Total articles: ${count}`);
  
  const published = await prisma.article.count({
    where: { status: 'PUBLISHED' }
  });
  console.log(`Published articles: ${published}`);
  
  if (published > 0) {
    const recent = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, publishedAt: true }
    });
    console.log("Most recent published articles:");
    recent.forEach(a => console.log(`- ${a.title} (${a.publishedAt})`));
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

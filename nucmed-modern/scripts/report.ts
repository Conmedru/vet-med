import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Total articles
  const total = await prisma.article.count();
  console.log(`\n=== TOTAL ARTICLES: ${total} ===\n`);

  // Per source breakdown
  const sources = await prisma.source.findMany({
    select: { id: true, name: true, slug: true },
  });

  for (const s of sources) {
    const count = await prisma.article.count({ where: { sourceId: s.id } });
    const recentCount = await prisma.article.count({
      where: {
        sourceId: s.id,
        originalPublishedAt: { gte: oneMonthAgo },
      },
    });
    const allTimeCount = await prisma.article.count({
      where: { sourceId: s.id },
    });

    const recent = await prisma.article.findMany({
      where: {
        sourceId: s.id,
        originalPublishedAt: { gte: oneMonthAgo },
      },
      select: { titleOriginal: true, originalPublishedAt: true, status: true },
      orderBy: { originalPublishedAt: 'desc' },
      take: 3,
    });

    console.log(`[${s.name}] Total: ${allTimeCount}, Last month: ${recentCount}`);
    for (const a of recent) {
      const date = a.originalPublishedAt ? a.originalPublishedAt.toISOString().split('T')[0] : 'no date';
      console.log(`  - ${date} | ${a.status} | ${a.titleOriginal.substring(0, 70)}`);
    }
    console.log('');
  }

  // Status breakdown
  const statuses = await prisma.article.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('=== STATUS BREAKDOWN ===');
  for (const s of statuses) {
    console.log(`  ${s.status}: ${s._count}`);
  }
}

main().finally(() => prisma.$disconnect());

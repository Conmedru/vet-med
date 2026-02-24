#!/usr/bin/env tsx
/**
 * Quick check script to see how many articles have Replicate URLs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for articles with Replicate URLs...\n');

  const articles = await prisma.article.findMany({
    where: {
      coverImageUrl: {
        contains: 'replicate',
      },
    },
    select: {
      id: true,
      title: true,
      titleOriginal: true,
      coverImageUrl: true,
      status: true,
    },
  });

  console.log(`Found ${articles.length} articles with Replicate URLs:\n`);

  articles.forEach((article, i) => {
    const title = article.title || article.titleOriginal;
    console.log(`${i + 1}. [${article.status}] ${title.slice(0, 50)}...`);
    console.log(`   URL: ${article.coverImageUrl?.slice(0, 80)}...\n`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);

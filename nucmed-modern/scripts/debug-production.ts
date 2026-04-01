import { PrismaClient } from '@prisma/client';
import { getPublishedArticles } from '../lib/articles';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Debugging Production Data...');
  try {
    const articles = await getPublishedArticles(10);
    console.log(`✅ Successfully fetched ${articles.length} articles.`);
    if (articles.length > 0) {
      console.log('Latest Article:', articles[0].title);
    } else {
      console.log('⚠️ No articles returned! Check status filters.');
    }
  } catch (error) {
    console.error('❌ Error fetching articles:', error);
  }
}

main().finally(() => prisma.$disconnect());

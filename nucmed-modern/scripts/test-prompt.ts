import { PrismaClient } from '@prisma/client';
import { processAndGenerateCover } from '../lib/ai/process-article';
// @ts-ignore
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log("Looking for an article to test...");
  
  // Find an INGESTED or DRAFT article, prioritizing clinical topics
  let article = await prisma.article.findFirst({
    where: { 
        status: { in: ['INGESTED', 'DRAFT', 'PUBLISHED'] },
        OR: [
            { titleOriginal: { contains: 'treatment', mode: 'insensitive' } },
            { titleOriginal: { contains: 'diagnosis', mode: 'insensitive' } },
            { titleOriginal: { contains: 'clinical', mode: 'insensitive' } },
            { titleOriginal: { contains: 'therapy', mode: 'insensitive' } },
            { titleOriginal: { contains: 'management', mode: 'insensitive' } },
            { contentOriginal: { contains: 'diagnosis', mode: 'insensitive' } },
            { contentOriginal: { contains: 'treatment', mode: 'insensitive' } }
        ]
    },
  });

  if (!article) {
    console.log("No clinical articles found (diagnosis/treatment). Falling back to first available.");
    article = await prisma.article.findFirst({
        where: { status: { in: ['INGESTED', 'DRAFT', 'PUBLISHED'] } }
    });
    
    if (!article) {
        console.log("No articles found in DB to test on.");
        return;
    }
  }

  console.log(`Processing article: ${article.id} ("${article.titleOriginal}")`);
  
  // Mock the generateAndSaveCover function if needed, or we just pass generateCover: false 
  // Wait, looking at processAndGenerateCover, generateCover: false skips cover generation.
  // Note: processAndGenerateCover uses the model from systemConfig (ai_model). 
  // For this test, let's force llama-3-70b in the call if we can, 
  // but looking at process-article.ts it reads from DB. 
  // Let's update the DB setting temporarily in the script.
  await prisma.systemConfig.upsert({
      where: { key: 'ai_model' },
      update: { value: 'llama-3-70b' },
      create: { key: 'ai_model', value: 'llama-3-70b' }
  });

  const result = await processAndGenerateCover(article.id, { generateCover: false });
  console.log("Processing result:", result);
  
  const processed = await prisma.article.findUnique({ where: { id: article.id } });
  if (processed) {
      const output = `# ${processed.title}\n\n**Excerpt:** ${processed.excerpt}\n\n**Category:** ${processed.category}\n\n---\n\n${processed.content}`;
      fs.writeFileSync('/tmp/processed-article-example.md', output);
      console.log("\n--- RESULT ---");
      console.log(output);
      console.log("--- END RESULT ---");
      console.log("\nSaved to /tmp/processed-article-example.md");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  });

/**
 * Embed all images in database using CLIP
 * Run: npx tsx scripts/embed-images.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { generateClipImageEmbeddings } from "../lib/ai/clip-embeddings";

const prisma = new PrismaClient({
  log: ["error"],
});
const CLIP_MODEL_ID = "andreasjansson/clip-features";

async function storeImageEmbedding(
  imageId: string,
  embedding: number[]
): Promise<void> {
  const embeddingStr = `[${embedding.join(",")}]`;
  
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "image_embeddings" WHERE "imageId" = ${imageId}
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE "image_embeddings" 
      SET embedding = ${embeddingStr}::vector(768),
          "updatedAt" = NOW()
      WHERE "imageId" = ${imageId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "image_embeddings" (id, "imageId", embedding, model, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${imageId},
        ${embeddingStr}::vector(768),
        ${CLIP_MODEL_ID},
        NOW(),
        NOW()
      )
    `;
  }
}

async function main() {
  console.log("Starting image embedding process...\n");

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Error: REPLICATE_API_TOKEN not set");
    process.exit(1);
  }

  // Find images without embeddings
  const images = await prisma.$queryRaw<{ id: string; originalUrl: string; storedUrl: string | null }[]>`
    SELECT i.id, i."originalUrl", i."storedUrl" 
    FROM "images" i
    LEFT JOIN "image_embeddings" ie ON i.id = ie."imageId"
    WHERE ie.id IS NULL AND i."originalUrl" IS NOT NULL
    ORDER BY i."createdAt" DESC
    LIMIT 100
  `;

  console.log(`Found ${images.length} images to embed\n`);

  if (images.length === 0) {
    console.log("No images to embed.");
    await prisma.$disconnect();
    return;
  }

  let success = 0;
  let failed = 0;
  const batchSize = 5;

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const urls = batch.map(img => img.storedUrl || img.originalUrl);

    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(images.length / batchSize)}...`);

    try {
      const result = await generateClipImageEmbeddings(urls);
      
      for (let j = 0; j < batch.length; j++) {
        try {
          // Handle case where model returns multiple embeddings per image
          const embeddingIndex = Math.min(j, result.embeddings.length - 1);
          await storeImageEmbedding(batch[j].id, result.embeddings[embeddingIndex].embedding);
          success++;
          console.log(`  ✓ ${batch[j].id}`);
        } catch (e) {
          console.error(`  ✗ ${batch[j].id}: ${e}`);
          failed++;
        }
      }
    } catch (e) {
      console.error(`  Batch failed: ${e}`);
      failed += batch.length;
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < images.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\n✓ Complete: ${success} success, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

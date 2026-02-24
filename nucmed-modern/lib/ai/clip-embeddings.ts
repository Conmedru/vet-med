/**
 * CLIP Embedding Service for Image/Text Vector Search
 * Uses andreasjansson/clip-features (clip-vit-large-patch14, 768 dimensions)
 * Hot model - no cold start delays
 */

import { prisma } from "../prisma";
import Replicate from "replicate";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const CLIP_MODEL_ID = "andreasjansson/clip-features";
const CLIP_VERSION = "75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a";
const CLIP_FULL_ID = `${CLIP_MODEL_ID}:${CLIP_VERSION}`;
const CLIP_DIMENSIONS = 768;

export interface ClipEmbeddingResult {
  embedding: number[];
  input: string;
  type: "image" | "text";
}

export interface ClipBatchResult {
  embeddings: ClipEmbeddingResult[];
  model: string;
}

/**
 * Generate CLIP embeddings for text strings
 * @param texts - Array of text strings
 */
export async function generateClipEmbeddings(texts: string[]): Promise<ClipBatchResult> {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  if (texts.length === 0) {
    return { embeddings: [], model: CLIP_MODEL_ID };
  }

  const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

  // Join texts with newlines for batch processing
  const textInput = texts.join("\n");

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("CLIP API request timed out after 60s")), 60000);
    });

    const predictionPromise = replicate.run(
      CLIP_FULL_ID as `${string}/${string}:${string}`,
      {
        input: {
          text: textInput,
        }
      }
    );

    const output = await Promise.race([predictionPromise, timeoutPromise]) as any[];

    if (!Array.isArray(output)) {
      throw new Error("Invalid response format from CLIP: expected array");
    }

    const embeddings: ClipEmbeddingResult[] = output.map((item, index) => {
      let embedding: number[];
      if (typeof item === 'object' && item !== null && 'embedding' in item) {
        embedding = item.embedding;
      } else if (Array.isArray(item)) {
        embedding = item;
      } else {
        throw new Error(`Invalid embedding format at index ${index}`);
      }

      return {
        embedding,
        input: texts[index],
        type: "text" as const,
      };
    });

    return {
      embeddings,
      model: CLIP_MODEL_ID,
    };
  } catch (error) {
    console.error("[CLIP] Text embedding generation failed:", error);
    throw error;
  }
}

/**
 * Generate CLIP embeddings for image URLs
 * @param imageUrls - Array of image URLs (http/https)
 */
export async function generateClipImageEmbeddings(imageUrls: string[]): Promise<ClipBatchResult> {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  if (imageUrls.length === 0) {
    return { embeddings: [], model: CLIP_MODEL_ID };
  }

  // Validate all URLs
  for (const url of imageUrls) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new Error(`Invalid image URL: ${url}`);
    }
  }

  const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

  // Join image URLs with newlines for batch processing
  const imageInput = imageUrls.join("\n");

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("CLIP API request timed out after 60s")), 60000);
    });

    const predictionPromise = replicate.run(
      CLIP_FULL_ID as `${string}/${string}:${string}`,
      {
        input: {
          images: imageInput,
        }
      }
    );

    const output = await Promise.race([predictionPromise, timeoutPromise]) as any[];

    if (!Array.isArray(output)) {
      throw new Error("Invalid response format from CLIP: expected array");
    }

    const embeddings: ClipEmbeddingResult[] = output.map((item, index) => {
      let embedding: number[];
      if (typeof item === 'object' && item !== null && 'embedding' in item) {
        embedding = item.embedding;
      } else if (Array.isArray(item)) {
        embedding = item;
      } else {
        throw new Error(`Invalid embedding format at index ${index}`);
      }

      return {
        embedding,
        input: imageUrls[index],
        type: "image" as const,
      };
    });

    return {
      embeddings,
      model: CLIP_MODEL_ID,
    };
  } catch (error) {
    console.error("[CLIP] Image embedding generation failed:", error);
    throw error;
  }
}

/**
 * Generate CLIP embedding for a single image URL
 */
export async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  const result = await generateClipImageEmbeddings([imageUrl]);
  if (result.embeddings.length === 0) {
    throw new Error("No embedding returned for image");
  }
  return result.embeddings[0].embedding;
}

/**
 * Generate CLIP text embedding (for searching images by text)
 */
export async function generateClipTextEmbedding(text: string): Promise<number[]> {
  const result = await generateClipEmbeddings([text]);
  if (result.embeddings.length === 0) {
    throw new Error("No embedding returned for text");
  }
  return result.embeddings[0].embedding;
}

/**
 * Store image embedding in database
 */
export async function storeImageEmbedding(
  imageId: string,
  imageUrl: string,
  embedding: number[]
): Promise<void> {
  const embeddingStr = `[${embedding.join(",")}]`;
  
  // Check if embedding already exists
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "ImageEmbedding" WHERE "imageId" = ${imageId}
  `;

  if (existing.length > 0) {
    // Update existing
    await prisma.$executeRaw`
      UPDATE "ImageEmbedding" 
      SET embedding = ${embeddingStr}::vector(768),
          "updatedAt" = NOW()
      WHERE "imageId" = ${imageId}
    `;
  } else {
    // Insert new
    await prisma.$executeRaw`
      INSERT INTO "ImageEmbedding" (id, "imageId", embedding, model, "createdAt", "updatedAt")
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

/**
 * Embed an image by ID (fetches URL from database)
 */
export async function embedImage(imageId: string): Promise<boolean> {
  try {
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      select: { id: true, originalUrl: true, storedUrl: true },
    });

    if (!image) {
      console.warn(`[CLIP] Image ${imageId} not found`);
      return false;
    }

    const imageUrl = image.storedUrl || image.originalUrl;
    if (!imageUrl) {
      console.warn(`[CLIP] Image ${imageId} has no URL`);
      return false;
    }

    const embedding = await generateImageEmbedding(imageUrl);
    await storeImageEmbedding(imageId, imageUrl, embedding);
    
    console.log(`[CLIP] Embedded image ${imageId}`);
    return true;
  } catch (error) {
    console.error(`[CLIP] Failed to embed image ${imageId}:`, error);
    return false;
  }
}

/**
 * Embed all images without embeddings
 */
export async function embedAllImages(batchSize: number = 5): Promise<{ success: number; failed: number }> {
  // Find images without embeddings
  const images = await prisma.$queryRaw<{ id: string; originalUrl: string; storedUrl: string | null }[]>`
    SELECT i.id, i."originalUrl", i."storedUrl" 
    FROM "Image" i
    LEFT JOIN "ImageEmbedding" ie ON i.id = ie."imageId"
    WHERE ie.id IS NULL AND i."originalUrl" IS NOT NULL
    LIMIT 100
  `;

  let success = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const urls = batch.map(img => img.storedUrl || img.originalUrl);

    try {
      const result = await generateClipImageEmbeddings(urls);
      
      for (let j = 0; j < batch.length; j++) {
        try {
          const url = batch[j].storedUrl || batch[j].originalUrl;
          await storeImageEmbedding(batch[j].id, url, result.embeddings[j].embedding);
          success++;
        } catch (e) {
          console.error(`[CLIP] Failed to store embedding for ${batch[j].id}:`, e);
          failed++;
        }
      }
    } catch (e) {
      console.error(`[CLIP] Batch embedding failed:`, e);
      failed += batch.length;
    }
  }

  return { success, failed };
}

/**
 * Search images by text query using CLIP
 */
export async function searchImagesByText(
  query: string,
  limit: number = 10,
  threshold: number = 0.25
): Promise<Array<{ imageId: string; similarity: number; url: string }>> {
  const embedding = await generateClipTextEmbedding(query);
  const embeddingStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRaw<Array<{
    imageId: string;
    similarity: number;
    url: string;
  }>>`
    SELECT 
      ie."imageId",
      1 - (ie.embedding <=> ${embeddingStr}::vector(768)) as similarity,
      i.url
    FROM "ImageEmbedding" ie
    JOIN "Image" i ON ie."imageId" = i.id
    WHERE 1 - (ie.embedding <=> ${embeddingStr}::vector(768)) > ${threshold}
    ORDER BY ie.embedding <=> ${embeddingStr}::vector(768)
    LIMIT ${limit}
  `;

  return results;
}

/**
 * Find similar images to a given image
 */
export async function findSimilarImages(
  imageId: string,
  limit: number = 10,
  threshold: number = 0.5
): Promise<Array<{ imageId: string; similarity: number; url: string }>> {
  // Get the source image embedding
  const sourceEmbedding = await prisma.$queryRaw<{ embedding: string }[]>`
    SELECT embedding::text FROM "ImageEmbedding" WHERE "imageId" = ${imageId}
  `;

  if (sourceEmbedding.length === 0) {
    throw new Error(`No embedding found for image ${imageId}`);
  }

  const embeddingStr = sourceEmbedding[0].embedding;

  const results = await prisma.$queryRaw<Array<{
    imageId: string;
    similarity: number;
    url: string;
  }>>`
    SELECT 
      ie."imageId",
      1 - (ie.embedding <=> ${embeddingStr}::vector(768)) as similarity,
      i.url
    FROM "ImageEmbedding" ie
    JOIN "Image" i ON ie."imageId" = i.id
    WHERE ie."imageId" != ${imageId}
      AND 1 - (ie.embedding <=> ${embeddingStr}::vector(768)) > ${threshold}
    ORDER BY ie.embedding <=> ${embeddingStr}::vector(768)
    LIMIT ${limit}
  `;

  return results;
}

export { CLIP_DIMENSIONS, CLIP_MODEL_ID };

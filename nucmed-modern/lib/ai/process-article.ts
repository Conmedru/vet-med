/**
 * Consolidated article processing module
 * Single source of truth for AI processing prompt and logic
 */

import { prisma } from "@/lib/prisma";
import { callReplicateAI } from "@/lib/ai/replicate";
import { generateArticleCover } from "@/lib/ai/replicate";
import { uploadImage, isS3Configured } from "@/lib/storage/s3";
import { withRetry } from "@/lib/utils/retry";
import { parsePartialJson } from "@/lib/utils/json";

export interface ProcessingResult {
  success: boolean;
  articleId: string;
  title?: string;
  error?: string;
  coverGenerated?: boolean;
}

/**
 * Process a single article: AI text processing + cover generation
 * Used by both cron auto-processor and manual API endpoint
 */
export async function processAndGenerateCover(
  articleId: string,
  options: { generateCover?: boolean } = { generateCover: true }
): Promise<ProcessingResult> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { source: true },
  });

  if (!article) {
    return { success: false, articleId, error: "Article not found" };
  }

  if (article.status !== "INGESTED" && article.status !== "FAILED") {
    return { success: false, articleId, error: `Invalid status: ${article.status}` };
  }

  // Step 1: Mark as PROCESSING
  await prisma.article.update({
    where: { id: articleId },
    data: { status: "PROCESSING" },
  });

  const startTime = Date.now();

  try {
    // Get AI model from settings
    const config = await prisma.systemConfig.findUnique({ where: { key: "ai_model" } });
    const aiModel = (config?.value as string) || "claude-3.7-sonnet";

    // Step 2: AI text processing via Replicate
    const prompt = `Заголовок: ${article.titleOriginal}
Источник: ${article.source?.name || "Unknown"}
Текст: ${article.contentOriginal.slice(0, 12000)}

Обработай статью и верни JSON согласно инструкциям.`;

    const aiResponse = await callReplicateAI(prompt, aiModel as any);
    const result = parsePartialJson(aiResponse.output);

    if (!result.title || !result.content || !result.category) {
      throw new Error("Missing required fields in AI response");
    }

    const processingTime = Date.now() - startTime;

    // Step 3: Update article with AI results → DRAFT
    await prisma.article.update({
      where: { id: articleId },
      data: {
        title: result.title,
        content: result.content,
        excerpt: result.excerpt,
        category: result.category,
        tags: result.tags || [],
        significanceScore: result.significanceScore,
        status: "DRAFT",
        aiModel: aiResponse.model,
        aiPromptVersion: "v2.0",
        processingCostUsd: aiResponse.costUsd,
        processingError: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "article.processed",
        entityType: "article",
        entityId: articleId,
        actorType: "system",
        metadata: {
          model: aiResponse.model,
          processingTimeMs: processingTime,
          costUsd: aiResponse.costUsd,
          category: result.category,
        },
      },
    });

    console.log(`[Process] AI done: "${result.title}" | ${result.category} | ${processingTime}ms`);

    // Step 4: Generate cover (optional)
    let coverGenerated = false;
    if (options.generateCover) {
      try {
        coverGenerated = await generateAndSaveCover(
          articleId,
          result.title,
          result.excerpt || "",
          result.category
        );
      } catch (coverError) {
        console.error(`[Process] Cover failed for ${articleId}:`, coverError);
        // Cover failure is non-fatal — article stays as DRAFT
      }
    }

    return {
      success: true,
      articleId,
      title: result.title,
      coverGenerated,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Process] Failed ${articleId}:`, errorMsg);

    await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "FAILED",
        processingError: errorMsg,
      },
    }).catch(console.error);

    return { success: false, articleId, error: errorMsg };
  }
}

/**
 * Generate AI cover and save to S3/DB
 */
async function generateAndSaveCover(
  articleId: string,
  title: string,
  excerpt: string,
  category: string
): Promise<boolean> {
  console.log(`[Cover] Generating for ${articleId}...`);

  const result = await generateArticleCover(title, excerpt, category);

  // Download image from Replicate
  const downloadImage = async () => {
    const imageResponse = await fetch(result.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Download failed: ${imageResponse.status}`);
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  };

  const buffer = await withRetry(downloadImage, {
    maxAttempts: 3,
    initialDelayMs: 2000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
    retryableErrors: ["429", "404", "rate limit"],
    onRetry: (attempt, error, delay) => {
      console.warn(`[Cover] Retry download (${attempt}) after ${delay}ms: ${error.message}`);
    },
  });

  let permanentUrl: string;
  if (isS3Configured()) {
    const date = new Date();
    const key = `articles/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${articleId}/cover-ai.webp`;
    permanentUrl = await uploadImage(buffer, key, "image/webp");
  } else {
    const base64 = buffer.toString("base64");
    permanentUrl = `data:image/webp;base64,${base64}`;
  }

  // Remove old cover
  await prisma.image.deleteMany({
    where: { articleId, isCover: true },
  });

  // Save new cover
  await prisma.image.create({
    data: {
      articleId,
      originalUrl: result.imageUrl,
      storedUrl: permanentUrl,
      isCover: true,
      caption: "AI-generated cover",
    },
  });

  await prisma.article.update({
    where: { id: articleId },
    data: { coverImageUrl: permanentUrl },
  });

  await prisma.activityLog.create({
    data: {
      action: "article.cover_generated",
      entityType: "article",
      entityId: articleId,
      actorType: "system",
      metadata: {
        prompt: result.prompt,
        costUsd: result.costUsd,
      },
    },
  });

  console.log(`[Cover] Done for ${articleId}`);
  return true;
}


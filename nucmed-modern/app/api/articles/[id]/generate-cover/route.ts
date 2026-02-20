import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminAuth, validateAuthWithDevBypass, getAuthUser } from "@/lib/auth";
import { generateArticleCover } from "@/lib/ai/replicate";
import { uploadImage, isS3Configured } from "@/lib/storage/s3";
import { withRetry } from "@/lib/utils/retry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/articles/[id]/generate-cover
 * Генерация обложки для статьи через AI
 * Accepts session cookie auth (admin panel) or API key auth (cron/scripts)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Session cookie auth (browser) or API key auth (scripts)
  const user = await getAuthUser();
  console.log("[GenerateCover API] Auth check:", { hasUser: !!user });
  
  if (!user) {
    const auth = validateAuthWithDevBypass(request, validateAdminAuth);
    console.log("[GenerateCover API] API auth:", { authenticated: auth.authenticated });
    if (!auth.authenticated) {
      console.log("[GenerateCover API] Auth failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { id } = await params;
  console.log("[GenerateCover API] Article ID:", id);

  try {
    // Получаем статью
    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        excerpt: true,
        category: true,
        titleOriginal: true,
        excerptOriginal: true,
      },
    });

    if (!article) {
      console.log("[GenerateCover API] Article not found:", id);
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Используем переведённый контент или оригинал
    const title = article.title || article.titleOriginal;
    const excerpt = article.excerpt || article.excerptOriginal || "";
    const category = article.category || "Визуализация";

    if (!title) {
      console.log("[GenerateCover API] No title for article:", id);
      return NextResponse.json(
        { error: "Article must have a title to generate cover" },
        { status: 400 }
      );
    }

    console.log(`[GenerateCover API] Starting for article: ${id}, title: ${title.slice(0, 50)}...`);

    // Генерируем обложку
    console.log("[GenerateCover API] Calling generateArticleCover...");
    const result = await generateArticleCover(title, excerpt, category);
    console.log(`[GenerateCover API] Replicate URL: ${result.imageUrl}`);

    // Скачиваем изображение с Replicate и сохраняем в постоянное хранилище
    let permanentUrl: string;
    
    const downloadImage = async () => {
      console.log(`[GenerateCover] Downloading image from Replicate...`);
      const imageResponse = await fetch(result.imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image from Replicate: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      return Buffer.from(await imageResponse.arrayBuffer());
    };

    const buffer = await withRetry(downloadImage, {
      maxAttempts: 4,
      initialDelayMs: 3000,
      backoffMultiplier: 2,
      maxDelayMs: 15000,
      retryableErrors: ["429", "404", "upstream", "rate limit", "too many requests", "throttled"],
      onRetry: (attempt, error, delay) => {
        console.warn(`[GenerateCover] Retry image download (${attempt}) after ${delay}ms: ${error.message}`);
      },
    });
    
    if (isS3Configured()) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const key = `articles/${year}/${month}/${id}/cover-ai.webp`;
      
      permanentUrl = await uploadImage(buffer, key, "image/webp");
      console.log(`[GenerateCover] Uploaded to S3: ${permanentUrl}`);
    } else {
      const base64 = buffer.toString("base64");
      permanentUrl = `data:image/webp;base64,${base64}`;
      console.log(`[GenerateCover] Saved as Base64 Data URL (${(base64.length / 1024).toFixed(2)} KB)`);
    }

    // Удаляем предыдущую обложку из Images (если была)
    await prisma.image.deleteMany({
      where: {
        articleId: id,
        isCover: true,
      },
    });

    // Добавляем новую обложку в Images
    await prisma.image.create({
      data: {
        articleId: id,
        originalUrl: result.imageUrl,
        storedUrl: permanentUrl,
        isCover: true,
        caption: "AI-сгенерированная обложка",
      },
    });

    // Обновляем статью с постоянным URL обложки
    const updated = await prisma.article.update({
      where: { id },
      data: {
        coverImageUrl: permanentUrl,
      },
      include: {
        source: true,
        images: true,
      },
    });

    // Логируем активность
    await prisma.activityLog.create({
      data: {
        action: "article.cover_generated",
        entityType: "article",
        entityId: id,
        metadata: {
          prompt: result.prompt,
          costUsd: result.costUsd,
        },
      },
    });

    console.log(`[GenerateCover] Success for article: ${id}`);

    return NextResponse.json({
      success: true,
      coverImageUrl: permanentUrl,
      replicateUrl: result.imageUrl,
      prompt: result.prompt,
      costUsd: result.costUsd,
      article: updated,
    });
  } catch (error) {
    console.error("[GenerateCover] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { error: "Failed to generate cover", details: message },
      { status: 500 }
    );
  }
}

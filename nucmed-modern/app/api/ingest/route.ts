import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { IngestedArticleSchema, type IngestResult } from "@/lib/schemas/ingestion";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/ingest
 * Принимает статью от парсера и сохраняет в БД
 * 
 * Используется парсерами для загрузки новых статей
 */
export async function POST(request: NextRequest) {
  try {
    // Проверка API ключа (простая защита)
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INGEST_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Валидация входных данных
    const parseResult = IngestedArticleSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: parseResult.error.flatten() 
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Проверяем существование источника
    const source = await prisma.source.findUnique({
      where: { slug: data.sourceId },
    });

    if (!source) {
      return NextResponse.json(
        { error: `Source '${data.sourceId}' not found` },
        { status: 404 }
      );
    }

    // Генерируем hash для дедупликации
    // НЕ включаем title - он может измениться, а статья та же
    const contentHash = crypto
      .createHash("sha256")
      .update(`${data.sourceId}:${data.externalId}`)
      .digest("hex");

    // Проверяем на дубликат
    const existingArticle = await prisma.article.findFirst({
      where: {
        OR: [
          { sourceId: source.id, externalId: data.externalId },
          { contentHash },
        ],
      },
    });

    if (existingArticle) {
      const result: IngestResult = {
        success: true,
        articleId: existingArticle.id,
        status: "duplicate",
        message: "Article already exists",
      };
      return NextResponse.json(result, { status: 200 });
    }

    // Создаём статью
    const article = await prisma.article.create({
      data: {
        sourceId: source.id,
        externalId: data.externalId,
        externalUrl: data.externalUrl,
        titleOriginal: data.title,
        contentOriginal: data.contentHtml,
        excerptOriginal: data.excerpt,
        language: data.language,
        authors: data.authors,
        tags: data.tags || [],
        contentHash,
        originalPublishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        scrapedAt: data.scrapedAt ? new Date(data.scrapedAt) : new Date(),
        status: "INGESTED",
        images: {
          create: data.images.map((img) => ({
            originalUrl: img.url,
            caption: img.caption,
            isCover: img.isCover,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    // Логируем активность
    await prisma.activityLog.create({
      data: {
        action: "article.ingested",
        entityType: "article",
        entityId: article.id,
        metadata: {
          source: source.slug,
          title: data.title,
        },
      },
    });

    const result: IngestResult = {
      success: true,
      articleId: article.id,
      status: "created",
      message: "Article ingested successfully",
    };

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingest
 * Информация об API
 */
export async function GET() {
  return NextResponse.json({
    name: "VetMed Ingestion API",
    version: "1.0.0",
    endpoints: {
      "POST /api/ingest": "Ingest single article",
    },
    requiredHeaders: {
      "x-api-key": "Your API key",
      "Content-Type": "application/json",
    },
  });
}

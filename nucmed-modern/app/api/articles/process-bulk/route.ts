import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAndGenerateCover } from "@/lib/ai/process-article";

/**
 * POST /api/articles/process-bulk
 * Batch AI processing of INGESTED articles (with cover generation)
 * 
 * Body: { limit?: number } - max articles per batch (default: 5)
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.ADMIN_API_KEY && apiKey !== process.env.INGEST_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { limit?: number } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body - use defaults
    }

    const limit = Math.min(body.limit || 5, 20);

    const articles = await prisma.article.findMany({
      where: { status: "INGESTED" },
      take: limit,
      orderBy: { createdAt: "asc" },
      select: { id: true, titleOriginal: true },
    });

    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        message: "No articles to process",
      });
    }

    console.log(`[Bulk] Processing ${articles.length} articles...`);

    let processed = 0;
    let failed = 0;
    const results: { id: string; title: string; success: boolean; error?: string }[] = [];

    for (const article of articles) {
      const result = await processAndGenerateCover(article.id, { generateCover: true });

      if (result.success) {
        processed++;
        results.push({ id: article.id, title: result.title || article.titleOriginal, success: true });
      } else {
        failed++;
        results.push({ id: article.id, title: article.titleOriginal, success: false, error: result.error });
      }

      // Cooldown between articles to respect Replicate rate limits
      if (articles.indexOf(article) < articles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10_000));
      }
    }

    console.log(`[Bulk] Complete: ${processed} processed, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: articles.length,
      results,
    });
  } catch (error) {
    console.error("Bulk processing error:", error);
    return NextResponse.json(
      { error: "Bulk processing failed", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;

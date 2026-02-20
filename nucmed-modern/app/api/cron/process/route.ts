import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAndGenerateCover } from "@/lib/ai/process-article";

const BATCH_SIZE = 3;
const COOLDOWN_MS = 12_000;
const MAX_RETRIES = 3;

/**
 * GET /api/cron/process
 * Auto-process INGESTED articles: AI translation + cover generation
 * Runs every 5 minutes via cron. Processes up to BATCH_SIZE articles per run.
 * 
 * Also retries FAILED articles up to MAX_RETRIES times.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const apiKey = request.headers.get("x-api-key");

    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isApiKeyValid = apiKey === process.env.INGEST_API_KEY || apiKey === process.env.ADMIN_API_KEY;

    if (!isVercelCron && !isApiKeyValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron Process] Starting auto-processing...");

    // 1. Get INGESTED articles (new, never processed)
    const ingestedArticles = await prisma.article.findMany({
      where: { status: "INGESTED" },
      take: BATCH_SIZE,
      orderBy: { createdAt: "asc" },
      select: { id: true, titleOriginal: true },
    });

    // 2. Get FAILED articles eligible for retry (retryCount < MAX_RETRIES)
    const remainingSlots = BATCH_SIZE - ingestedArticles.length;
    let failedArticles: { id: string; titleOriginal: string }[] = [];

    if (remainingSlots > 0) {
      const failedRaw = await prisma.article.findMany({
        where: {
          status: "FAILED",
          // Only retry articles that haven't exceeded max retries
          // We track retries via processingError field pattern: "retry:N|..."
        },
        take: remainingSlots,
        orderBy: { updatedAt: "asc" },
        select: { id: true, titleOriginal: true, processingError: true },
      });

      // Filter by retry count
      failedArticles = failedRaw.filter((a) => {
        const retryMatch = (a.processingError || "").match(/^retry:(\d+)\|/);
        const retryCount = retryMatch ? parseInt(retryMatch[1], 10) : 0;
        return retryCount < MAX_RETRIES;
      });
    }

    const articlesToProcess = [...ingestedArticles, ...failedArticles];

    if (articlesToProcess.length === 0) {
      console.log("[Cron Process] No articles to process");
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        message: "No articles to process",
      });
    }

    console.log(`[Cron Process] Processing ${articlesToProcess.length} articles (${ingestedArticles.length} new, ${failedArticles.length} retries)...`);

    let processed = 0;
    let failed = 0;
    const results: { id: string; title: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < articlesToProcess.length; i++) {
      const article = articlesToProcess[i];

      // For retries, reset status back to INGESTED so processAndGenerateCover accepts it
      const currentArticle = await prisma.article.findUnique({
        where: { id: article.id },
        select: { status: true, processingError: true },
      });

      if (currentArticle?.status === "FAILED") {
        const retryMatch = (currentArticle.processingError || "").match(/^retry:(\d+)\|/);
        const retryCount = retryMatch ? parseInt(retryMatch[1], 10) : 0;

        await prisma.article.update({
          where: { id: article.id },
          data: {
            status: "INGESTED",
            processingError: `retry:${retryCount + 1}|${currentArticle.processingError?.replace(/^retry:\d+\|/, "") || ""}`,
          },
        });
      }

      const result = await processAndGenerateCover(article.id, { generateCover: true });

      if (result.success) {
        processed++;
        results.push({ id: article.id, title: result.title || article.titleOriginal, success: true });
        console.log(`[Cron Process] OK: ${(result.title || article.titleOriginal).slice(0, 50)}`);
      } else {
        failed++;
        results.push({ id: article.id, title: article.titleOriginal, success: false, error: result.error });
        console.error(`[Cron Process] FAIL: ${article.titleOriginal.slice(0, 50)} — ${result.error}`);
      }

      // Cooldown between articles (skip after last)
      if (i < articlesToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, COOLDOWN_MS));
      }
    }

    console.log(`[Cron Process] Done: ${processed} processed, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: articlesToProcess.length,
      results,
    });
  } catch (error) {
    console.error("[Cron Process] Error:", error);
    return NextResponse.json(
      {
        error: "Auto-processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

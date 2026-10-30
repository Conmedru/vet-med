import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron";
import { prisma } from "@/lib/prisma";
import { generateAndSaveCover, processAndGenerateCover } from "@/lib/ai/process-article";

const BATCH_SIZE = 3;
const COOLDOWN_MS = 12_000;
const MAX_RETRIES = 3;
/** Articles that went out without a cover get one per run, newest first */
const COVER_BACKFILL_PER_RUN = 2;
const COVER_BACKFILL_DAYS = 60;
/** A cover that failed this many times is left to the editor: every try is billed by Replicate */
const COVER_BACKFILL_MAX_FAILURES = 3;
/** Failures per article since the server started (no column for it; a deploy gives each one more chance) */
const coverFailures = new Map<string, number>();

/**
 * GET /api/cron/process
 * Auto-process INGESTED articles: AI translation + cover generation
 * Runs every 5 minutes via cron. Processes up to BATCH_SIZE articles per run.
 * 
 * Also retries FAILED articles up to MAX_RETRIES times.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request, ["INGEST_API_KEY", "ADMIN_API_KEY"])) {
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

    const coversFilled = await backfillCovers();

    if (articlesToProcess.length === 0) {
      console.log("[Cron Process] No articles to process");
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        coversFilled,
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
      coversFilled,
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

/**
 * Published or scheduled articles without a cover (cover generation failed while
 * processing, e.g. Replicate out of credits). Failures are logged and retried next run.
 */
async function backfillCovers(): Promise<number> {
  const since = new Date(Date.now() - COVER_BACKFILL_DAYS * 24 * 60 * 60 * 1000);
  const missing = await prisma.article.findMany({
    where: {
      status: { in: ["PUBLISHED", "SCHEDULED"] },
      coverImageUrl: null,
      title: { not: null },
      OR: [{ publishedAt: { gte: since } }, { scheduledAt: { gte: since } }],
      id: { notIn: [...coverFailures].filter(([, n]) => n >= COVER_BACKFILL_MAX_FAILURES).map(([id]) => id) },
    },
    orderBy: { updatedAt: "desc" },
    take: COVER_BACKFILL_PER_RUN,
    select: { id: true, title: true, excerpt: true, category: true },
  });
  let filled = 0;
  for (const a of missing) {
    try {
      if (await generateAndSaveCover(a.id, a.title!, a.excerpt || "", a.category || "Общая ветеринария")) filled++;
    } catch (error) {
      coverFailures.set(a.id, (coverFailures.get(a.id) ?? 0) + 1);
      console.error(`[Cron Process] Cover backfill failed for ${a.id} (${coverFailures.get(a.id)}/${COVER_BACKFILL_MAX_FAILURES}):`, error);
    }
  }
  if (filled) console.log(`[Cron Process] Filled ${filled} missing cover(s)`);
  return filled;
}

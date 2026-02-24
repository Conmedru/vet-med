import { NextRequest, NextResponse } from "next/server";
import { ingestSource } from "@/lib/scraper";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/scrape
 * Умный cron - обновляет только источники, чей интервал истёк
 * Запускается каждый час, но каждый источник обновляется по своему расписанию
 * 
 * Защита: проверка CRON_SECRET или x-api-key
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации для cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const apiKey = request.headers.get("x-api-key");

    // Vercel Cron использует Authorization: Bearer <CRON_SECRET>
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isApiKeyValid = apiKey === process.env.INGEST_API_KEY || apiKey === process.env.ADMIN_API_KEY;

    if (!isVercelCron && !isApiKeyValid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting smart scheduled scrape...");
    
    // Получаем все активные источники
    const sources = await prisma.source.findMany({
      where: { isActive: true },
    });

    const now = new Date();
    const results = [];
    let skippedCount = 0;

    for (const source of sources) {
      // Проверяем, нужно ли обновлять этот источник
      const lastScraped = source.lastScrapedAt;
      const intervalMs = source.scrapeIntervalMinutes * 60 * 1000;
      
      if (lastScraped) {
        const timeSinceLastScrape = now.getTime() - lastScraped.getTime();
        if (timeSinceLastScrape < intervalMs) {
          // Ещё не пора обновлять
          skippedCount++;
          console.log(`[Cron] Skipping ${source.name} - next update in ${Math.round((intervalMs - timeSinceLastScrape) / 60000)} min`);
          continue;
        }
      }

      // Пора обновлять
      console.log(`[Cron] Scraping ${source.name}...`);
      try {
        const result = await ingestSource(source.id);
        results.push(result);
      } catch (error) {
        console.error(`[Cron] Error scraping ${source.name}:`, error);
        results.push({
          sourceId: source.id,
          sourceName: source.name,
          totalFetched: 0,
          newArticles: 0,
          duplicates: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        });
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      totalSources: sources.length,
      sourcesScraped: results.length,
      sourcesSkipped: skippedCount,
      totalNewArticles: results.reduce((sum, r) => sum + r.newArticles, 0),
      totalDuplicates: results.reduce((sum, r) => sum + r.duplicates, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    };

    console.log(`[Cron] Completed: ${summary.sourcesScraped} scraped, ${summary.sourcesSkipped} skipped, ${summary.totalNewArticles} new articles`);

    // Trigger auto-processing if new articles were ingested
    if (summary.totalNewArticles > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const processKey = process.env.INGEST_API_KEY || process.env.ADMIN_API_KEY;
      
      fetch(`${baseUrl}/api/cron/process`, {
        headers: { "x-api-key": processKey || "" },
      }).catch((err) => {
        console.error("[Cron] Failed to trigger auto-processing:", err);
      });
      
      console.log(`[Cron] Triggered auto-processing for ${summary.totalNewArticles} new articles`);
    }

    return NextResponse.json({
      success: true,
      summary,
      results,
    });

  } catch (error) {
    console.error("[Cron] Scrape error:", error);
    return NextResponse.json(
      { 
        error: "Cron scrape failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 minutes for scraping multiple sources

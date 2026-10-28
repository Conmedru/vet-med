import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron";
import { syncScrapedEvents } from "@/lib/events/sync";

/**
 * GET /api/cron/events
 * Сбор ветеринарных мероприятий с сайтов из ТЗ (zooinform, expomap, PRO PLAN, АВЗ, АВК)
 * Запускается раз в сутки
 */
export async function GET(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await syncScrapedEvents();
    const summary = {
      created: results.reduce((sum, r) => sum + r.created, 0),
      updated: results.reduce((sum, r) => sum + r.updated, 0),
      duplicates: results.reduce((sum, r) => sum + r.duplicates, 0),
      failedSources: results.filter((r) => r.error).map((r) => r.source),
    };

    return NextResponse.json({ success: true, summary, results });
  } catch (error) {
    console.error("[Cron] Events sync error:", error);
    return NextResponse.json(
      { error: "Events sync failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

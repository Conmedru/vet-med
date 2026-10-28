import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { syncScrapedEvents } from "@/lib/events/sync";

function safeEqual(value: string | null, expected: string): boolean {
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/cron/events
 * Сбор ветеринарных мероприятий с сайтов из ТЗ (zooinform, expomap, PRO PLAN, АВЗ, АВК)
 * Запускается раз в сутки
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const apiKey = request.headers.get("x-api-key");

    const adminApiKey = process.env.ADMIN_API_KEY;

    // Fail closed: an unset secret must not match "Bearer undefined"
    const isVercelCron = !!cronSecret && safeEqual(authHeader, `Bearer ${cronSecret}`);
    const isApiKeyValid = !!adminApiKey && safeEqual(apiKey, adminApiKey);

    if (!isVercelCron && !isApiKeyValid) {
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

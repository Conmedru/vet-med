import { NextRequest, NextResponse } from "next/server";
import { ingestAllSources, ingestSource } from "@/lib/scraper";
import {
  getAuthUser,
  isLocalRequest,
  validateAdminAuth,
  validateIngestAuth,
} from "@/lib/auth";

/**
 * POST /api/ingest/scrape
 * Запускает парсинг RSS-фидов и сохраняет новые статьи
 * 
 * Body (optional):
 *   { sourceId: string } - парсить только конкретный источник
 * 
 * Headers:
 *   x-api-key: API ключ для авторизации
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      const ingestAuth = validateIngestAuth(request);
      const adminAuth = validateAdminAuth(request);
      const devBypass = process.env.NODE_ENV === "development" && isLocalRequest(request);

      if (!devBypass && !ingestAuth.authenticated && !adminAuth.authenticated) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    let body: { sourceId?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine - will scrape all sources
    }

    let results;

    if (body.sourceId) {
      // Scrape specific source
      const result = await ingestSource(body.sourceId);
      results = [result];
    } else {
      // Scrape all active sources
      results = await ingestAllSources();
    }

    const summary = {
      totalSources: results.length,
      totalNewArticles: results.reduce((sum, r) => sum + r.newArticles, 0),
      totalDuplicates: results.reduce((sum, r) => sum + r.duplicates, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });

  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { 
        error: "Scrape failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingest/scrape
 * Информация о статусе парсинга
 */
export async function GET() {
  return NextResponse.json({
    name: "VetMed RSS Scraper",
    version: "1.0.0",
    usage: {
      "POST /api/ingest/scrape": "Scrape all active sources",
      "POST /api/ingest/scrape + {sourceId}": "Scrape specific source",
    },
    requiredHeaders: {
      "x-api-key": "INGEST_API_KEY or ADMIN_API_KEY",
    },
  });
}

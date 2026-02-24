import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/search/fast
 * Fast PostgreSQL ILIKE Search
 * 
 * Query params:
 * - q: search query (required, min 2 chars)
 * - limit: max results (default: 10, max: 50)
 * - category: filter by category
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const category = searchParams.get("category");

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: "Search query must be at least 2 characters" },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  const cleanQuery = query.trim();
  const searchPattern = `%${cleanQuery}%`;

  try {
    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      slug: string | null;
      title: string;
      titleOriginal: string;
      excerpt: string | null;
      category: string | null;
      publishedAt: Date | null;
    }>>(`
      SELECT 
        a.id,
        a.slug,
        a.title,
        a."titleOriginal",
        a.excerpt,
        a.category,
        a."publishedAt"
      FROM articles a
      WHERE a.status = 'PUBLISHED'
        AND (
          a.title ILIKE $1 OR 
          a."titleOriginal" ILIKE $1 OR 
          a.excerpt ILIKE $1
        )
        ${category ? `AND a.category = '${category.replace(/'/g, "''")}'` : ""}
      ORDER BY a."publishedAt" DESC NULLS LAST
      LIMIT $2
    `, searchPattern, limit);

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      query: cleanQuery,
      results: results.map(r => ({
        id: r.id,
        slug: r.slug,
        title: r.title || r.titleOriginal,
        excerpt: r.excerpt,
        category: r.category,
        publishedAt: r.publishedAt,
      })),
      total: results.length,
      latencyMs,
    }, {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    console.error("[Search/Fast] Error:", error);
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

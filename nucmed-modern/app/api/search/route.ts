import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchArticlesByVector } from "@/lib/ai/embeddings";

/**
 * GET /api/search
 * Hybrid search: vector similarity + text search fallback
 * 
 * Query params:
 * - q: search query (required)
 * - mode: "vector" | "text" | "hybrid" (default: "hybrid")
 * - limit: max results (default: 10)
 * - category: filter by category
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const mode = searchParams.get("mode") || "hybrid";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const category = searchParams.get("category");

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: "Search query must be at least 2 characters" },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    let results: Array<{
      id: string;
      slug?: string | null;
      title: string;
      excerpt: string | null;
      category: string | null;
      similarity?: number;
      matchType: "vector" | "text";
    }> = [];

    // Vector search (semantic)
    if (mode === "vector" || mode === "hybrid") {
      try {
        const vectorResults = await searchArticlesByVector(query, {
          limit,
          categoryFilter: category || undefined,
          threshold: 0.65,
        });

        results = vectorResults.map(r => ({
          ...r,
          matchType: "vector" as const,
        }));
      } catch (error) {
        console.warn("[Search] Vector search failed, falling back to text:", error);
        // Fall through to text search
      }
    }

    // Text search (fallback or hybrid supplement)
    if (mode === "text" || (mode === "hybrid" && results.length < limit)) {
      const textResults = await prisma.article.findMany({
        where: {
          status: "PUBLISHED",
          ...(category && { category }),
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { titleOriginal: { contains: query, mode: "insensitive" } },
            { excerpt: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
            { tags: { has: query } },
          ],
        },
        select: {
          id: true,
          slug: true,
          title: true,
          titleOriginal: true,
          excerpt: true,
          category: true,
        },
        take: limit,
        orderBy: { publishedAt: "desc" },
      });

      // Merge with vector results, avoiding duplicates
      const existingIds = new Set(results.map(r => r.id));
      for (const article of textResults) {
        if (!existingIds.has(article.id)) {
          results.push({
            id: article.id,
            slug: article.slug,
            title: article.title || article.titleOriginal,
            excerpt: article.excerpt,
            category: article.category,
            matchType: "text",
          });
        }
      }
    }

    // Limit final results
    results = results.slice(0, limit);

    const latencyMs = Date.now() - startTime;

    // Log search query for analytics (fire and forget)
    logSearchQuery(query, results.length, latencyMs).catch(() => {});

    return NextResponse.json({
      query,
      mode,
      results,
      total: results.length,
      latencyMs,
    }, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[Search] Error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

async function logSearchQuery(query: string, resultsCount: number, latencyMs: number) {
  try {
    await prisma.$executeRaw`
      INSERT INTO search_queries (id, query, "resultsCount", "latencyMs", "createdAt")
      VALUES (gen_random_uuid(), ${query}, ${resultsCount}, ${latencyMs}, NOW())
    `;
  } catch {
    // Ignore logging errors
  }
}

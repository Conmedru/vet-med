import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRouteAuth } from "@/lib/auth";

/**
 * GET /api/admin/stats
 * Single endpoint for all dashboard stats - reduces multiple API calls to one
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const [
      draftsCount,
      ingestedCount,
      scheduledCount,
      publishedCount,
      failedCount,
      recentArticles,
    ] = await Promise.all([
      prisma.article.count({ where: { status: "DRAFT" } }),
      prisma.article.count({ where: { status: "INGESTED" } }),
      prisma.article.count({ where: { status: "SCHEDULED" } }),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.article.count({ where: { status: "FAILED" } }),
      prisma.article.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          titleOriginal: true,
          status: true,
          createdAt: true,
          source: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        drafts: draftsCount + ingestedCount,
        scheduled: scheduledCount,
        published: publishedCount,
        failed: failedCount,
        ingested: ingestedCount,
      },
      recentArticles,
    }, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

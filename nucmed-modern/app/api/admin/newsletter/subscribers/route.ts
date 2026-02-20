import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth, getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const search = request.nextUrl.searchParams.get("search") || "";
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 100);
    const offset = (page - 1) * limit;

    // Total counts
    const totalSubscribers = await prisma.subscriber.count();
    const activeSubscribers = await prisma.subscriber.count({ where: { status: "active" } });
    const digestSubscribers = await prisma.subscriber.count({ where: { status: "active", digestEnabled: true } });

    // Category breakdown — count subscribers per category
    const allActive = await prisma.subscriber.findMany({
      where: { status: "active" },
      select: { categories: true },
    });

    const categoryStats: Record<string, number> = {};
    for (const sub of allActive) {
      for (const cat of sub.categories) {
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
      }
    }

    // Sorted category stats
    const sortedCategoryStats = Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    // Subscriber list with optional search
    const where = search
      ? { email: { contains: search, mode: "insensitive" as const } }
      : {};

    const [subscribers, filteredTotal] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          categories: true,
          digestEnabled: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.subscriber.count({ where }),
    ]);

    return NextResponse.json({
      stats: {
        total: totalSubscribers,
        active: activeSubscribers,
        digest: digestSubscribers,
        byCategory: sortedCategoryStats,
      },
      subscribers,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        pages: Math.ceil(filteredTotal / limit),
      },
    });
  } catch (error) {
    console.error("Failed to get subscribers:", error);
    return NextResponse.json({ error: "Failed to get subscribers" }, { status: 500 });
  }
}

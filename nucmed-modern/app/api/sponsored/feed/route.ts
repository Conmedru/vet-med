import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/**
 * GET /api/sponsored/feed
 * Public: get active sponsored posts for feed integration
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    const posts = await prisma.sponsoredPost.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        targetUrl: true,
        advertiserName: true,
        category: true,
      },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[Sponsored] Feed error:", error);
    return NextResponse.json({ posts: [] });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleIds, markAll } = body;

    if (markAll) {
      // Mark all unread articles as read
      await prisma.article.updateMany({
        where: {
          viewedAt: null,
          status: {
            in: ["INGESTED", "DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"],
          },
        },
        data: {
          viewedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: "All articles marked as read" });
    }

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json(
        { error: "articleIds array is required" },
        { status: 400 }
      );
    }

    // Mark specific articles as read
    await prisma.article.updateMany({
      where: {
        id: { in: articleIds },
        viewedAt: null,
      },
      data: {
        viewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark articles as read:", error);
    return NextResponse.json(
      { error: "Failed to mark articles as read" },
      { status: 500 }
    );
  }
}

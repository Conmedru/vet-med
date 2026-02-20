import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/newsletter/unsubscribe?token=xxx&category=xxx
// category is optional — if provided, only unsubscribe from that category
// if not provided, unsubscribe from everything
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const category = request.nextUrl.searchParams.get("category");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    if (category) {
      // Remove single category
      const updated = await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          categories: subscriber.categories.filter((c) => c !== category),
        },
      });
      return NextResponse.json({
        success: true,
        action: "category_removed",
        category,
        remaining: updated.categories,
      });
    } else {
      // Full unsubscribe
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          status: "unsubscribed",
          categories: [],
          digestEnabled: false,
        },
      });
      return NextResponse.json({
        success: true,
        action: "unsubscribed",
      });
    }
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

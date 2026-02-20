import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.article.count({
      where: {
        viewedAt: null,
        status: {
          in: ["INGESTED", "DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"],
        },
      },
    });

    return NextResponse.json({ count }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return NextResponse.json({ count: 0 });
  }
}

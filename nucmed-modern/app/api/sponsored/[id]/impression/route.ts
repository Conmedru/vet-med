import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/sponsored/[id]/impression
 * Public: track impression on a sponsored post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    await prisma.sponsoredPost.update({
      where: { id },
      data: { impressions: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 404 });
  }
}

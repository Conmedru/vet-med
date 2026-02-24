import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// GET /api/newsletter/preferences?token=xxx — get subscriber preferences
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: subscriber.email,
      categories: subscriber.categories,
      digestEnabled: subscriber.digestEnabled,
      status: subscriber.status,
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  token: z.string(),
  categories: z.array(z.string()).optional(),
  digestEnabled: z.boolean().optional(),
});

// PUT /api/newsletter/preferences — update subscriber preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = UpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { token, categories, digestEnabled } = result.data;

    const subscriber = await prisma.subscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
    }

    const updated = await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        ...(categories !== undefined && { categories }),
        ...(digestEnabled !== undefined && { digestEnabled }),
      },
    });

    return NextResponse.json({
      success: true,
      categories: updated.categories,
      digestEnabled: updated.digestEnabled,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

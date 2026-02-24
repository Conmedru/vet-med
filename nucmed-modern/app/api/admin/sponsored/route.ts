import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth, getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(1000).optional().nullable(),
  targetUrl: z.string().url(),
  advertiserName: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
});

/**
 * GET /api/admin/sponsored
 * List all sponsored posts (admin)
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const auth = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const posts = await prisma.sponsoredPost.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[Sponsored] List error:", error);
    return NextResponse.json({ error: "Failed to list sponsored posts" }, { status: 500 });
  }
}

/**
 * POST /api/admin/sponsored
 * Create a new sponsored post
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const auth = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const post = await prisma.sponsoredPost.create({
      data: {
        title: data.title,
        description: data.description || null,
        targetUrl: data.targetUrl,
        advertiserName: data.advertiserName || null,
        category: data.category || null,
        priority: data.priority ?? 0,
        isActive: data.isActive ?? true,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("[Sponsored] Create error:", error);
    return NextResponse.json({ error: "Failed to create sponsored post" }, { status: 500 });
  }
}

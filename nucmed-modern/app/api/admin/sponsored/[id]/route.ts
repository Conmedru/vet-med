import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth, getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).optional().nullable(),
  targetUrl: z.string().url().optional(),
  advertiserName: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
});

async function checkAuth(request: NextRequest) {
  const user = await getAuthUser();
  if (user) return true;
  const auth = validateAuthWithDevBypass(request, validateAdminAuth);
  return auth.authenticated;
}

/**
 * GET /api/admin/sponsored/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await prisma.sponsoredPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    console.error("[Sponsored] Get error:", error);
    return NextResponse.json({ error: "Failed to get post" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/sponsored/[id]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.targetUrl !== undefined) updateData.targetUrl = data.targetUrl;
    if (data.advertiserName !== undefined) updateData.advertiserName = data.advertiserName;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;

    const post = await prisma.sponsoredPost.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[Sponsored] Update error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/sponsored/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.sponsoredPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sponsored] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}

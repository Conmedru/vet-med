import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth, getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadImage, isS3Configured } from "@/lib/storage/s3";
import { processImage } from "@/lib/storage/image-processor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/sponsored/[id]/upload-cover
 * Upload cover image for a sponsored post
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    const auth = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!auth.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { id } = await params;

  try {
    const post = await prisma.sponsoredPost.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Sponsored post not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum 10MB" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let coverImageUrl: string;

    if (isS3Configured()) {
      const processed = await processImage(buffer);
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const key = `sponsored/${year}/${month}/${id}/cover.webp`;

      coverImageUrl = await uploadImage(processed.original, key, "image/webp");
    } else {
      const base64 = buffer.toString("base64");
      coverImageUrl = `data:${file.type};base64,${base64}`;
    }

    const updated = await prisma.sponsoredPost.update({
      where: { id },
      data: { coverImageUrl },
    });

    return NextResponse.json({ success: true, coverImageUrl, post: updated });
  } catch (error) {
    console.error("[Sponsored] Upload cover error:", error);
    return NextResponse.json({ error: "Failed to upload cover" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminAuth, validateAuthWithDevBypass } from "@/lib/auth";
import { uploadImage, isS3Configured } from "@/lib/storage/s3";
import { processImage } from "@/lib/storage/image-processor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/articles/[id]/upload-cover
 * Upload custom cover image for article
 * Accepts multipart/form-data with 'file' field
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = validateAuthWithDevBypass(request, validateAdminAuth);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB" },
        { status: 400 }
      );
    }

    console.log(`[UploadCover] Processing file: ${file.name}, size: ${file.size}`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let coverImageUrl: string;

    if (isS3Configured()) {
      // Process and upload to S3
      const processed = await processImage(buffer);
      
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const key = `articles/${year}/${month}/${id}/cover.webp`;

      coverImageUrl = await uploadImage(processed.original, key, "image/webp");
      console.log(`[UploadCover] Uploaded to S3: ${coverImageUrl}`);
    } else {
      // S3 not configured - convert to base64 data URL (for dev/testing)
      const base64 = buffer.toString("base64");
      coverImageUrl = `data:${file.type};base64,${base64}`;
      console.log(`[UploadCover] S3 not configured, using data URL`);
    }

    // Remove existing cover image from Images table
    await prisma.image.deleteMany({
      where: {
        articleId: id,
        isCover: true,
      },
    });

    // Add new cover to Images table
    await prisma.image.create({
      data: {
        articleId: id,
        originalUrl: coverImageUrl,
        storedUrl: coverImageUrl,
        isCover: true,
        caption: "Загруженная обложка",
      },
    });

    // Update article with new cover URL
    const updated = await prisma.article.update({
      where: { id },
      data: { coverImageUrl },
      include: {
        source: true,
        images: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "article.cover_uploaded",
        entityType: "article",
        entityId: id,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      },
    });

    return NextResponse.json({
      success: true,
      coverImageUrl,
      article: updated,
    });
  } catch (error) {
    console.error("[UploadCover] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to upload cover", details: message },
      { status: 500 }
    );
  }
}

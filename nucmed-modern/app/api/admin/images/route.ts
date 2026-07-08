import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRouteAuth } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  const authResponse = await requireAdminRouteAuth(request);
  if (authResponse) return authResponse;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const filter = searchParams.get("filter") || "all";
  const limit = parseInt(searchParams.get("limit") || "50");

  const whereClause: Record<string, unknown> = {};

  if (search) {
    whereClause.OR = [
      { caption: { contains: search, mode: "insensitive" } },
      { article: { title: { contains: search, mode: "insensitive" } } },
      { article: { titleOriginal: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (filter === "no-s3") {
    whereClause.storedUrl = null;
  }

  const images = await prisma.image.findMany({
    where: whereClause,
    include: {
      article: {
        select: {
          id: true,
          title: true,
          titleOriginal: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Get embedding status for each image
  const imageIds = images.map(img => img.id);
  const embeddings = await prisma.$queryRaw<Array<{ imageId: string }>>`
    SELECT "imageId" FROM image_embeddings WHERE "imageId" = ANY(${imageIds})
  `;
  const embeddingSet = new Set(embeddings.map(e => e.imageId));

  // Filter by embedding status if needed
  let filteredImages = images;
  if (filter === "no-embedding") {
    filteredImages = images.filter(img => !embeddingSet.has(img.id));
  }

  const imagesWithEmbedding = filteredImages.map(img => ({
    ...img,
    hasEmbedding: embeddingSet.has(img.id),
  }));

  // Stats
  const [total, withS3, withEmbeddings] = await Promise.all([
    prisma.image.count(),
    prisma.image.count({ where: { storedUrl: { not: null } } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) as count FROM image_embeddings`,
  ]);

  return NextResponse.json({
    images: imagesWithEmbedding,
    stats: {
      total,
      withS3,
      withEmbeddings: Number(withEmbeddings[0]?.count || 0),
    },
  });
}

export async function POST(request: NextRequest) {
  const authResponse = await requireAdminRouteAuth(request);
  if (authResponse) return authResponse;

  try {
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

    let imageUrl: string;

    const { uploadImage, isS3Configured } = await import("@/lib/storage/s3");
    const { processImage } = await import("@/lib/storage/image-processor");

    if (isS3Configured()) {
      const processed = await processImage(buffer);
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const randomId = Math.random().toString(36).substring(2, 15);
      const key = `uploads/${year}/${month}/${randomId}.webp`;

      imageUrl = await uploadImage(processed.original, key, "image/webp");
    } else {
      const base64 = buffer.toString("base64");
      imageUrl = `data:${file.type};base64,${base64}`;
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("[Images] Upload error:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}


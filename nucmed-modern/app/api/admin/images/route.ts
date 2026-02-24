import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthWithDevBypass, validateAdminAuth } from "@/lib/auth/simple";

export async function GET(request: NextRequest) {
  const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

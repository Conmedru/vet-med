import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthWithDevBypass, validateAdminAuth } from "@/lib/auth/simple";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Delete embedding first
    await prisma.$executeRaw`DELETE FROM image_embeddings WHERE "imageId" = ${id}`;
    
    // Get image to check for S3 files
    const image = await prisma.image.findUnique({
      where: { id },
      select: { storedUrl: true, thumbnailSmUrl: true, thumbnailMdUrl: true, thumbnailLgUrl: true },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from database
    await prisma.image.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

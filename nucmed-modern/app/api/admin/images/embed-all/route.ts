import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthWithDevBypass, validateAdminAuth } from "@/lib/auth/simple";
import { embedImage } from "@/lib/ai/clip-embeddings";

export async function POST(request: NextRequest) {
  const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find images without embeddings
    const imagesWithoutEmbeddings = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT i.id 
      FROM images i
      LEFT JOIN image_embeddings e ON e."imageId" = i.id
      WHERE e.id IS NULL
      LIMIT 50
    `;

    if (imagesWithoutEmbeddings.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No images need embedding",
        processed: 0 
      });
    }

    let success = 0;
    let failed = 0;

    for (const image of imagesWithoutEmbeddings) {
      try {
        await embedImage(image.id);
        success++;
      } catch (error) {
        console.error(`Failed to embed image ${image.id}:`, error);
        failed++;
      }
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${success + failed} images`,
      processed: success,
      failed,
    });
  } catch (error) {
    console.error("Failed to batch embed images:", error);
    return NextResponse.json(
      { error: "Failed to batch embed images" },
      { status: 500 }
    );
  }
}

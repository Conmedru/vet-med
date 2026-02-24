import { NextRequest, NextResponse } from "next/server";
import { searchImagesByText } from "@/lib/ai/clip-embeddings";

/**
 * GET /api/images/search
 * Search images by text query using CLIP embeddings
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const threshold = parseFloat(searchParams.get("threshold") || "0.25");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  try {
    const results = await searchImagesByText(query, limit, threshold);

    return NextResponse.json({
      query,
      results: results.map(r => ({
        imageId: r.imageId,
        url: r.url,
        similarity: Math.round(r.similarity * 1000) / 1000,
      })),
      count: results.length,
    });
  } catch (error) {
    console.error("[ImageSearch] Error:", error);
    return NextResponse.json(
      { error: "Image search failed" },
      { status: 500 }
    );
  }
}

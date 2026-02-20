import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth, validateAuthWithDevBypass, getAuthUser } from "@/lib/auth";
import { processAndGenerateCover } from "@/lib/ai/process-article";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/articles/[id]/process
 * AI processing + cover generation for a single article
 * Accepts session cookie auth (admin panel) or API key auth (cron/scripts)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Check session cookie first (browser admin panel)
  const user = await getAuthUser();
  if (!user) {
    // Fallback to API key auth (cron/scripts)
    const auth = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
  }

  const { id } = await params;

  const result = await processAndGenerateCover(id, { generateCover: true });

  if (!result.success) {
    return NextResponse.json(
      { error: "Processing failed", message: result.error },
      { status: result.error === "Article not found" ? 404 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    articleId: result.articleId,
    title: result.title,
    coverGenerated: result.coverGenerated,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAuth } from "@/lib/auth";
import { SourcePreviewRequestSchema, SourcePreviewResponseSchema } from "@/lib/schemas/source";
import { previewSourceScrape } from "@/lib/scraper/preview";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const input = SourcePreviewRequestSchema.parse(body);

    const preview = await previewSourceScrape(id, input);
    if (!preview) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const payload = SourcePreviewResponseSchema.parse(preview);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    console.error("[Source Preview] error:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

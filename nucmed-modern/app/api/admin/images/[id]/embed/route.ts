import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth } from "@/lib/auth/simple";
import { embedImage } from "@/lib/ai/clip-embeddings";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await embedImage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to embed image:", error);
    return NextResponse.json(
      { error: "Failed to embed image" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth, getAuthUser } from "@/lib/auth";
import { generateWeeklyDigest } from "@/lib/newsletter";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const weekOffset = parseInt(searchParams.get("weekOffset") || "0");
  const format = searchParams.get("format") || "html";

  try {
    const digest = await generateWeeklyDigest(weekOffset);

    if (format === "json") {
      return NextResponse.json(digest);
    }

    if (format === "text") {
      return new NextResponse(digest.plainText, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Default: return HTML
    return new NextResponse(digest.html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Failed to generate preview:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}

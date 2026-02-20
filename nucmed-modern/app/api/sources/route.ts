import { NextResponse } from "next/server";
import { getSourcesWithHealth } from "@/lib/sources/service";

export async function GET() {
  try {
    const sources = await getSourcesWithHealth();
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Sources list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

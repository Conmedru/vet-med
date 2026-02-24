import { NextResponse } from "next/server";
import { getLatestJournalIssueForBanner, listPublishedJournalIssues } from "@/lib/magazine";
import { JournalPublicResponseSchema } from "@/lib/schemas/journal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [issues, latestIssue] = await Promise.all([
      listPublishedJournalIssues(),
      getLatestJournalIssueForBanner(),
    ]);

    const payload = JournalPublicResponseSchema.parse({ issues, latestIssue });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[Journal API] fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch journal issues" }, { status: 500 });
  }
}

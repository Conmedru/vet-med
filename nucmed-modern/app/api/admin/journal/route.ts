import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAuth } from "@/lib/auth";
import {
  createJournalIssue,
  JournalServiceError,
  listJournalIssuesAdmin,
} from "@/lib/magazine";
import {
  JournalIssueCreateSchema,
  JournalIssueListResponseSchema,
  JournalIssueSingleResponseSchema,
} from "@/lib/schemas/journal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const issues = await listJournalIssuesAdmin();
    const payload = JournalIssueListResponseSchema.parse({ issues });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[Admin Journal] list error:", error);
    return NextResponse.json({ error: "Failed to fetch journal issues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const input = JournalIssueCreateSchema.parse(body);
    const issue = await createJournalIssue(input);
    const payload = JournalIssueSingleResponseSchema.parse({ issue });
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof JournalServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    console.error("[Admin Journal] create error:", error);
    return NextResponse.json({ error: "Failed to create journal issue" }, { status: 500 });
  }
}

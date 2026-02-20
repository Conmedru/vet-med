import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAuth } from "@/lib/auth";
import {
  deleteJournalIssue,
  getJournalIssueById,
  JournalServiceError,
  updateJournalIssue,
} from "@/lib/magazine";
import {
  JournalDeleteResponseSchema,
  JournalIssueSingleResponseSchema,
  JournalIssueUpdateSchema,
} from "@/lib/schemas/journal";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const issue = await getJournalIssueById(id);
    if (!issue) {
      return NextResponse.json({ error: "Journal issue not found" }, { status: 404 });
    }

    const payload = JournalIssueSingleResponseSchema.parse({ issue });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[Admin Journal] get error:", error);
    return NextResponse.json({ error: "Failed to fetch journal issue" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const body = await request.json();
    const input = JournalIssueUpdateSchema.parse(body);
    const issue = await updateJournalIssue(id, input);
    const payload = JournalIssueSingleResponseSchema.parse({ issue });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof JournalServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    console.error("[Admin Journal] update error:", error);
    return NextResponse.json({ error: "Failed to update journal issue" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await deleteJournalIssue(id);
    const payload = JournalDeleteResponseSchema.parse({ success: true as const });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof JournalServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[Admin Journal] delete error:", error);
    return NextResponse.json({ error: "Failed to delete journal issue" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAuth } from "@/lib/auth";
import { assertJournalCoverFile, JournalCoverError, storeJournalIssueCover } from "@/lib/magazine/cover";
import { JournalServiceError, setJournalIssueCover } from "@/lib/magazine";
import { JournalIssueSingleResponseSchema } from "@/lib/schemas/journal";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    assertJournalCoverFile(file);

    const coverImageUrl = await storeJournalIssueCover(id, file);
    const issue = await setJournalIssueCover(id, coverImageUrl);

    const payload = JournalIssueSingleResponseSchema.parse({ issue });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof JournalCoverError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof JournalServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[Admin Journal] cover upload error:", error);
    return NextResponse.json({ error: "Failed to upload journal cover" }, { status: 500 });
  }
}

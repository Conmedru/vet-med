import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAuth } from "@/lib/auth";
import { SourceUpdateSchema } from "@/lib/schemas/source";
import { getSourceById, updateSourceById } from "@/lib/sources/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const source = await getSourceById(id);

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await request.json();
    const input = SourceUpdateSchema.parse(body);

    const updated = await updateSourceById(id, input);

    if (!updated) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAuth } from "@/lib/auth";
import { deleteEvent, EventServiceError, getEventById, updateEvent } from "@/lib/events";
import {
  EventDeleteResponseSchema,
  EventSingleResponseSchema,
  EventUpdateSchema,
} from "@/lib/schemas/events";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(EventSingleResponseSchema.parse({ event }));
  } catch (error) {
    console.error("[Admin Events] get error:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    const body = await request.json();
    const input = EventUpdateSchema.parse(body);
    const event = await updateEvent(id, input);
    return NextResponse.json(EventSingleResponseSchema.parse({ event }));
  } catch (error) {
    if (error instanceof EventServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    console.error("[Admin Events] update error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  try {
    await deleteEvent(id);
    return NextResponse.json(EventDeleteResponseSchema.parse({ success: true }));
  } catch (error) {
    if (error instanceof EventServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[Admin Events] delete error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}

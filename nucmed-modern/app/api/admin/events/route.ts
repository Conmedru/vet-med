import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAuth } from "@/lib/auth";
import { createEvent, listEventsAdmin, EventServiceError } from "@/lib/events";
import {
  EventCreateSchema,
  EventListResponseSchema,
  EventSingleResponseSchema,
} from "@/lib/schemas/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const events = await listEventsAdmin();
    return NextResponse.json(EventListResponseSchema.parse({ events }));
  } catch (error) {
    if (error instanceof EventServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[Admin Events] list error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const input = EventCreateSchema.parse(body);
    const event = await createEvent(input);
    return NextResponse.json(EventSingleResponseSchema.parse({ event }), { status: 201 });
  } catch (error) {
    if (error instanceof EventServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    console.error("[Admin Events] create error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}

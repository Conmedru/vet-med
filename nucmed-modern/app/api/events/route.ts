import { NextRequest, NextResponse } from "next/server";
import { EventServiceError, listEventsByMonth } from "@/lib/events";
import { EventMonthResponseSchema } from "@/lib/schemas/events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const payload = await listEventsByMonth(month);
    return NextResponse.json(EventMonthResponseSchema.parse(payload));
  } catch (error) {
    if (error instanceof EventServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[Events API] fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

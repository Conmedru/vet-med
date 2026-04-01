import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EventApiItem, EventCreateInput, EventUpdateInput } from "@/lib/schemas/events";

const eventSelect = {
  id: true,
  title: true,
  description: true,
  organizer: true,
  eventDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EventSelect;

type EventRecord = Prisma.EventGetPayload<{
  select: typeof eventSelect;
}>;

export class EventServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "EventServiceError";
  }
}

function toApiEvent(event: EventRecord): EventApiItem {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    organizer: event.organizer,
    eventDate: event.eventDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function normalizeMonthKey(month?: string | null, fallbackDate: Date = new Date()): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    return month;
  }

  return `${fallbackDate.getUTCFullYear()}-${String(fallbackDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month?: string | null): { monthKey: string; start: Date; end: Date } {
  const monthKey = normalizeMonthKey(month);
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new EventServiceError("Invalid month", 400);
  }

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

  return { monthKey, start, end };
}

export function getCurrentMonthKey(date: Date = new Date()): string {
  return normalizeMonthKey(null, date);
}

export function getEventDateKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function listEventsAdmin(): Promise<EventApiItem[]> {
  const events = await prisma.event.findMany({
    orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    select: eventSelect,
  });

  return events.map(toApiEvent);
}

export async function listEventsByMonth(month?: string | null): Promise<{ month: string; events: EventApiItem[] }> {
  const { monthKey, start, end } = getMonthRange(month);
  const events = await prisma.event.findMany({
    where: {
      eventDate: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    select: eventSelect,
  });

  return {
    month: monthKey,
    events: events.map(toApiEvent),
  };
}

export async function getEventById(id: string): Promise<EventApiItem | null> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: eventSelect,
  });

  if (!event) return null;
  return toApiEvent(event);
}

export async function createEvent(input: EventCreateInput): Promise<EventApiItem> {
  const event = await prisma.event.create({
    data: {
      title: input.title,
      description: input.description || null,
      organizer: input.organizer,
      eventDate: input.eventDate,
    },
    select: eventSelect,
  });

  return toApiEvent(event);
}

export async function updateEvent(id: string, input: EventUpdateInput): Promise<EventApiItem> {
  try {
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.organizer !== undefined ? { organizer: input.organizer } : {}),
        ...(input.eventDate !== undefined ? { eventDate: input.eventDate } : {}),
      },
      select: eventSelect,
    });

    return toApiEvent(event);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new EventServiceError("Event not found", 404);
    }

    throw error;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    await prisma.event.delete({
      where: { id },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new EventServiceError("Event not found", 404);
    }

    throw error;
  }
}

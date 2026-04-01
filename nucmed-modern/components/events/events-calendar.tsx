"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventApiItem } from "@/lib/schemas/events";

interface EventsCalendarProps {
  initialMonth: string;
  initialEvents: EventApiItem[];
}

const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getMonthDate(month: string): Date {
  const [year, monthValue] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthValue - 1, 1));
}

function getMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getDateKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getDefaultSelectedDate(month: string, events: EventApiItem[]): string {
  if (events.length > 0) {
    return getDateKey(events[0].eventDate);
  }

  return `${month}-01`;
}

function formatMonthLabel(month: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(getMonthDate(month));
}

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function buildCalendarDays(month: string): Array<number | null> {
  const monthDate = getMonthDate(month);
  const year = monthDate.getUTCFullYear();
  const monthIndex = monthDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const startingDayOfWeek = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = lastDay.getUTCDate();
  const days: Array<number | null> = [];

  for (let index = 0; index < startingDayOfWeek; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(day);
  }

  return days;
}

export function EventsCalendar({ initialMonth, initialEvents }: EventsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [events, setEvents] = useState<EventApiItem[]>(initialEvents);
  const [selectedDateKey, setSelectedDateKey] = useState(getDefaultSelectedDate(initialMonth, initialEvents));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      if (currentMonth === initialMonth) {
        setEvents(initialEvents);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/events?month=${currentMonth}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load events");
        }

        if (!cancelled) {
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error("Failed to load month events:", error);
        if (!cancelled) {
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadMonth();

    return () => {
      cancelled = true;
    };
  }, [currentMonth, initialEvents, initialMonth]);

  useEffect(() => {
    setSelectedDateKey((currentValue) => {
      if (currentValue.startsWith(`${currentMonth}-`)) {
        return currentValue;
      }

      return getDefaultSelectedDate(currentMonth, events);
    });
  }, [currentMonth, events]);

  const eventsByDate = useMemo(() => {
    const nextMap = new Map<string, EventApiItem[]>();

    events.forEach((event) => {
      const dateKey = getDateKey(event.eventDate);
      const dayEvents = nextMap.get(dateKey) || [];
      dayEvents.push(event);
      nextMap.set(dateKey, dayEvents);
    });

    return nextMap;
  }, [events]);

  const selectedDayEvents = eventsByDate.get(selectedDateKey) || [];
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const todayKey = getDateKey(new Date());

  function moveMonth(offset: number) {
    const baseDate = getMonthDate(currentMonth);
    const nextDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + offset, 1));
    setCurrentMonth(getMonthKey(nextDate));
  }

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6">
      <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <CalendarDays className="h-3.5 w-3.5" />
              Мероприятия
            </div>
            <div className="text-2xl font-serif font-bold tracking-tight text-stone-900 sm:text-3xl">
              Календарь событий
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50/70 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              disabled={isLoading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center text-lg font-semibold capitalize text-stone-900 sm:text-xl">
              {formatMonthLabel(currentMonth)}
            </div>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              disabled={isLoading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            {dayNames.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square rounded-2xl" />;
              }

              const dateKey = `${currentMonth}-${String(day).padStart(2, "0")}`;
              const hasEvents = eventsByDate.has(dateKey);
              const isSelected = selectedDateKey === dateKey;
              const isToday = todayKey === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  className={cn(
                    "relative aspect-square rounded-2xl border text-sm font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                      : "border-stone-200 bg-white text-stone-700 hover:border-primary/30 hover:text-primary",
                    isToday && !isSelected ? "border-primary/40 text-primary" : ""
                  )}
                >
                  <span>{day}</span>
                  {hasEvents && (
                    <span
                      className={cn(
                        "absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full",
                        isSelected ? "bg-white" : "bg-primary"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">На выбранную дату</div>
            <div className="mt-2 text-xl font-serif font-bold tracking-tight text-stone-900 sm:text-2xl">
              {formatFullDate(`${selectedDateKey}T00:00:00.000Z`)}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {selectedDayEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-5 py-10 text-center">
              <div className="text-lg font-semibold text-stone-900">На эту дату мероприятий пока нет</div>
            </div>
          ) : (
            selectedDayEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white to-stone-50 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-stone-900">{event.title}</div>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600">
                      <Users className="h-3.5 w-3.5" />
                      {event.organizer}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(event.eventDate))}
                  </div>
                </div>
                {event.description && (
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                    {event.description}
                  </div>
                )}
                {event.linkUrl && (
                  <a
                    href={event.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Перейти к мероприятию
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin, PartyPopper, Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventApiItem } from "@/lib/schemas/events";
import type { VetDate } from "@/lib/vet-dates";

interface EventsCalendarProps {
  initialMonth: string;
  initialEvents: EventApiItem[];
  initialVetDates: VetDate[];
}

const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Today if it is in the month, else the first day with something on it, else the 1st */
function getDefaultSelectedDate(month: string, events: EventApiItem[], vetDates: VetDate[]): string {
  const todayKey = getDateKey(new Date());
  if (todayKey.startsWith(`${month}-`)) {
    return todayKey;
  }

  const firstEvent = events.map((e) => getDateKey(e.eventDate)).find((key) => key.startsWith(`${month}-`));
  return firstEvent || vetDates[0]?.date || `${month}-01`;
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

const shortDate = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", timeZone: "UTC" });

function formatEventDates(event: EventApiItem): string {
  const start = shortDate.format(new Date(event.eventDate));
  return event.endDate ? `${start} – ${shortDate.format(new Date(event.endDate))}` : start;
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

export function EventsCalendar({ initialMonth, initialEvents, initialVetDates }: EventsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [events, setEvents] = useState<EventApiItem[]>(initialEvents);
  const [vetDates, setVetDates] = useState<VetDate[]>(initialVetDates);
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    getDefaultSelectedDate(initialMonth, initialEvents, initialVetDates)
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMonth() {
      if (currentMonth === initialMonth) {
        setEvents(initialEvents);
        setVetDates(initialVetDates);
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
          setVetDates(data.vetDates || []);
        }
      } catch (error) {
        console.error("Failed to load month events:", error);
        if (!cancelled) {
          setEvents([]);
          setVetDates([]);
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
  }, [currentMonth, initialEvents, initialVetDates, initialMonth]);

  useEffect(() => {
    setSelectedDateKey((currentValue) => {
      if (currentValue.startsWith(`${currentMonth}-`)) {
        return currentValue;
      }

      return getDefaultSelectedDate(currentMonth, events, vetDates);
    });
  }, [currentMonth, events, vetDates]);

  // Multi-day events are shown on every day of their range within the month
  const eventsByDate = useMemo(() => {
    const nextMap = new Map<string, EventApiItem[]>();
    const monthStart = getMonthDate(currentMonth);
    const monthEnd = Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0);

    events.forEach((event) => {
      const start = Math.max(new Date(event.eventDate).getTime(), monthStart.getTime());
      const end = Math.min(event.endDate ? new Date(event.endDate).getTime() : start, monthEnd);
      for (let time = start; time <= end; time += DAY_MS) {
        const dateKey = getDateKey(new Date(time));
        const dayEvents = nextMap.get(dateKey) || [];
        dayEvents.push(event);
        nextMap.set(dateKey, dayEvents);
      }
    });

    return nextMap;
  }, [events, currentMonth]);

  const vetDatesByDate = useMemo(() => {
    const nextMap = new Map<string, VetDate[]>();
    vetDates.forEach((vetDate) => {
      nextMap.set(vetDate.date, [...(nextMap.get(vetDate.date) || []), vetDate]);
    });
    return nextMap;
  }, [vetDates]);

  const selectedDayEvents = eventsByDate.get(selectedDateKey) || [];
  const selectedDayVetDates = vetDatesByDate.get(selectedDateKey) || [];
  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const todayKey = getDateKey(new Date());

  function moveMonth(offset: number) {
    const baseDate = getMonthDate(currentMonth);
    const nextDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + offset, 1));
    setCurrentMonth(getMonthKey(nextDate));
  }

  return (
    <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-5">
      <div className="rounded-[28px] border border-white/80 bg-white/65 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_20px_50px_-28px_rgba(11,42,51,0.28)] backdrop-blur-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <CalendarDays className="h-3.5 w-3.5" />
              Мероприятия
            </div>
            <div className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
              Календарь событий
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/80 bg-white/70 p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              disabled={isLoading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center text-base font-semibold capitalize text-stone-900 sm:text-lg">
              {formatMonthLabel(currentMonth)}
            </div>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              disabled={isLoading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            {dayNames.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square rounded-xl" />;
              }

              const dateKey = `${currentMonth}-${String(day).padStart(2, "0")}`;
              const hasEvents = eventsByDate.has(dateKey);
              const hasVetDates = vetDatesByDate.has(dateKey);
              const isSelected = selectedDateKey === dateKey;
              const isToday = todayKey === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  className={cn(
                    "relative aspect-square rounded-xl border text-[15px] font-medium transition-all",
                    isSelected
                      ? "border-primary bg-primary text-white shadow-md shadow-primary/15"
                      : "border-stone-200 bg-white text-stone-700 hover:border-primary/30 hover:text-primary",
                    isToday && !isSelected ? "border-primary/40 text-primary" : ""
                  )}
                >
                  <span>{day}</span>
                  {(hasEvents || hasVetDates) && (
                    <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
                      {hasEvents && (
                        <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-white" : "bg-primary")} />
                      )}
                      {hasVetDates && (
                        <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-amber-200" : "bg-amber-500")} />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Мероприятия
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Памятные даты
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white/65 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_20px_50px_-28px_rgba(11,42,51,0.28)] backdrop-blur-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">На выбранную дату</div>
            <div className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">
              {formatFullDate(`${selectedDateKey}T00:00:00.000Z`)}
            </div>
          </div>
        </div>

        <div className="mt-4 max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {selectedDayVetDates.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                <PartyPopper className="h-3.5 w-3.5" />
                Памятная дата
              </div>
              <ul className="mt-2 space-y-1">
                {selectedDayVetDates.map((vetDate) => (
                  <li key={vetDate.title} className="text-sm font-medium leading-6 text-stone-900">
                    {vetDate.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedDayEvents.length === 0 ? (
            selectedDayVetDates.length === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-8 text-center">
                <div className="text-base font-semibold text-stone-900">На эту дату мероприятий пока нет</div>
              </div>
            )
          ) : (
            selectedDayEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white to-stone-50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-semibold leading-6 text-stone-900">{event.title}</div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-medium text-stone-600">
                        <Users className="h-3.5 w-3.5" />
                        {event.organizer}
                      </span>
                      {event.isOnline ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary">
                          <Video className="h-3.5 w-3.5" />
                          Онлайн
                        </span>
                      ) : (
                        event.location && (
                          <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-medium text-stone-600">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {event.location}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {formatEventDates(event)}
                  </div>
                </div>
                {event.description && (
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600 line-clamp-4">
                    {event.description}
                  </div>
                )}
                {event.linkUrl && (
                  <a
                    href={event.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
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

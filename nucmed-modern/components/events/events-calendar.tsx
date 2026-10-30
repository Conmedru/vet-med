"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, PartyPopper, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventApiItem } from "@/lib/schemas/events";
import type { VetDate } from "@/lib/vet-dates";

interface EventsCalendarProps {
  initialMonth: string;
  initialEvents: EventApiItem[];
  initialVetDates: VetDate[];
}

const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
/** Agenda rows shown before «Показать ещё» */
const AGENDA_LIMIT = 6;
/** Agenda horizon from the selected day: crosses into the next month near the month's end */
const AGENDA_DAYS = 30;
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

const shortDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });
const tileMonth = new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });

type AgendaItem =
  | { kind: "event"; key: string; date: string; event: EventApiItem }
  | { kind: "vet"; key: string; date: string; title: string };

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

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const todayKey = getDateKey(new Date());
  const [showAll, setShowAll] = useState(false);
  const [nextMonth, setNextMonth] = useState<{ month: string; events: EventApiItem[]; vetDates: VetDate[] } | null>(null);

  // Next month's items for the agenda horizon (the grid shows the current month only)
  useEffect(() => {
    const base = getMonthDate(currentMonth);
    const month = getMonthKey(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1)));
    let cancelled = false;
    fetch(`/api/events?month=${month}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) setNextMonth({ month, events: data.events || [], vetDates: data.vetDates || [] });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentMonth]);

  // Agenda (Luma-style): the next AGENDA_DAYS from the selected day, events and memorable dates together
  const agenda = useMemo<AgendaItem[]>(() => {
    const horizonKey = getDateKey(new Date(new Date(`${selectedDateKey}T00:00:00Z`).getTime() + AGENDA_DAYS * DAY_MS));
    const following = nextMonth && nextMonth.month > currentMonth ? nextMonth : null;
    const allEvents = [...events, ...(following?.events ?? []).filter((e) => !events.some((x) => x.id === e.id))];
    const allVetDates = [...vetDates, ...(following?.vetDates ?? [])];
    const items: AgendaItem[] = [
      ...allEvents.map((event) => {
        const start = getDateKey(event.eventDate);
        // A multi-day event that started earlier is listed on the first day still running
        const end = event.endDate ? getDateKey(event.endDate) : start;
        const date = start < selectedDateKey && end >= selectedDateKey ? selectedDateKey : start;
        return { kind: "event" as const, key: `e-${event.id}`, date, event };
      }),
      ...allVetDates.map((v) => ({ kind: "vet" as const, key: `v-${v.date}-${v.title}`, date: v.date, title: v.title })),
    ];
    return items
      .filter((item) => item.date >= selectedDateKey && item.date < horizonKey)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === "event" ? -1 : 1));
  }, [events, vetDates, nextMonth, selectedDateKey, currentMonth]);
  const visible = showAll ? agenda : agenda.slice(0, AGENDA_LIMIT);

  useEffect(() => setShowAll(false), [selectedDateKey, currentMonth]);

  function moveMonth(offset: number) {
    const baseDate = getMonthDate(currentMonth);
    const nextDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + offset, 1));
    setCurrentMonth(getMonthKey(nextDate));
  }

  const monthStartKey = `${currentMonth}-01`;
  const isFiltered = selectedDateKey !== monthStartKey && selectedDateKey !== todayKey;

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/65 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_20px_50px_-28px_rgba(11,42,51,0.28)] backdrop-blur-2xl sm:p-7">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_288px]">
        {/* Agenda */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div>
              <p className="text-[13px] font-medium text-primary">Мероприятия и памятные даты</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">Календарь событий</h2>
            </div>
            <p className="text-sm text-stone-500">
              {isFiltered ? (
                <>
                  с {dayMonth.format(new Date(`${selectedDateKey}T00:00:00Z`))}
                  {" · "}
                  <button type="button" onClick={() => setSelectedDateKey(getDefaultSelectedDate(currentMonth, events, vetDates))} className="font-medium text-primary hover:underline">
                    сбросить
                  </button>
                </>
              ) : (
                <span>Ближайшие {AGENDA_DAYS} дней</span>
              )}
            </p>
          </div>

          <ul className={cn("mt-5 divide-y divide-stone-200/70 border-y border-stone-200/70 transition-opacity", isLoading && "opacity-50")}>
            {visible.map((item) => (
              <li key={item.key} className="flex gap-4 py-3.5">
                <DateTile date={item.date} tone={item.kind === "vet" ? "amber" : "teal"} />
                {item.kind === "event" ? (
                  <EventRow event={item.event} />
                ) : (
                  <div className="min-w-0 self-center">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <PartyPopper className="h-3.5 w-3.5" />
                      Памятная дата
                    </p>
                    <p className="mt-0.5 text-[15px] font-medium leading-snug text-stone-900">{item.title}</p>
                  </div>
                )}
              </li>
            ))}
            {agenda.length === 0 && (
              <li className="flex flex-col items-start gap-3 py-8">
                <p className="text-[15px] text-stone-600">В ближайшие {AGENDA_DAYS} дней событий нет.</p>
                <button type="button" onClick={() => moveMonth(1)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Следующий месяц <ChevronRight className="h-4 w-4" />
                </button>
              </li>
            )}
          </ul>

          {agenda.length > AGENDA_LIMIT && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium text-primary hover:underline">
              {showAll ? "Свернуть" : `Показать ещё ${agenda.length - AGENDA_LIMIT}`}
            </button>
          )}
        </div>

        {/* Mini month calendar */}
        <div className="lg:border-l lg:border-stone-200/70 lg:pl-8">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold capitalize text-stone-900">{formatMonthLabel(currentMonth).replace(/\s*г\.$/, "")}</span>
            <div className="flex gap-1">
              {[
                { offset: -1, label: "Предыдущий месяц", Icon: ChevronLeft },
                { offset: 1, label: "Следующий месяц", Icon: ChevronRight },
              ].map(({ offset, label, Icon }) => (
                <button
                  key={offset}
                  type="button"
                  onClick={() => moveMonth(offset)}
                  disabled={isLoading}
                  aria-label={label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-medium text-stone-400">
            {dayNames.map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarDays.map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} />;
              const dateKey = `${currentMonth}-${String(day).padStart(2, "0")}`;
              const hasEvents = eventsByDate.has(dateKey);
              const hasVetDates = vetDatesByDate.has(dateKey);
              const isSelected = selectedDateKey === dateKey;
              const isToday = todayKey === dateKey;
              const isPast = dateKey < todayKey;
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  aria-pressed={isSelected}
                  aria-label={`${day}${hasEvents ? ", есть мероприятия" : ""}${hasVetDates ? ", памятная дата" : ""}`}
                  className="group flex h-10 flex-col items-center justify-center"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors",
                      isSelected
                        ? "bg-primary font-semibold text-white shadow-[0_6px_14px_-6px_hsl(var(--primary))]"
                        : isToday
                          ? "font-semibold text-primary ring-1 ring-primary/40"
                          : isPast
                            ? "text-stone-400 group-hover:bg-stone-100"
                            : "text-stone-700 group-hover:bg-primary/10 group-hover:text-primary"
                    )}
                  >
                    {day}
                  </span>
                  <span className="flex h-1 gap-0.5">
                    {hasEvents && <span className="h-1 w-1 rounded-full bg-primary" />}
                    {hasVetDates && <span className="h-1 w-1 rounded-full bg-amber-500" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Мероприятия</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Памятные даты</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Tear-off calendar page: month on a tinted strip, day number below (Luma event rows) */
function DateTile({ date, tone }: { date: string; tone: "teal" | "amber" }) {
  const value = new Date(`${date}T00:00:00Z`);
  return (
    <div className="w-12 shrink-0 self-start overflow-hidden rounded-xl border border-stone-200/80 bg-white text-center shadow-[0_1px_2px_rgba(11,42,51,0.06)]">
      <div className={cn("py-0.5 text-[10px] font-semibold uppercase tracking-wide", tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-primary/10 text-primary")}>
        {tileMonth.format(value).replace(".", "")}
      </div>
      <div className="py-1 text-lg font-semibold leading-none tabular-nums text-stone-900">{value.getUTCDate()}</div>
    </div>
  );
}

function EventRow({ event }: { event: EventApiItem }) {
  const place = event.isOnline ? "Онлайн" : event.location;
  const content = (
    <>
      <p className="text-[15px] font-medium leading-snug text-stone-900 transition-colors group-hover:text-primary">
        {event.title}
        {event.linkUrl && <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 -translate-y-px text-stone-400 transition-colors group-hover:text-primary" />}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-stone-500">
        {event.endDate && <span>{formatEventDates(event)}</span>}
        {place && (
          <span className="inline-flex items-center gap-1">
            {event.isOnline ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            {place}
          </span>
        )}
        {event.organizer && <span className="text-stone-400">{event.organizer}</span>}
      </p>
    </>
  );
  return event.linkUrl ? (
    <a href={event.linkUrl} target="_blank" rel="noopener noreferrer" className="group min-w-0 self-center">
      {content}
    </a>
  ) : (
    <div className="min-w-0 self-center">{content}</div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Building2, CalendarDays, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { formatDateUTC } from "@/lib/utils/date";
import type { EventApiItem } from "@/lib/schemas/events";

type ViewMode = "list" | "create" | "edit";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingEvent, setEditingEvent] = useState<EventApiItem | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/events");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch events");
      }
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    return {
      total: events.length,
      upcoming: events.filter((event) => new Date(event.eventDate).getTime() >= now.getTime()).length,
      currentMonth: events.filter((event) => event.eventDate.slice(0, 7) === currentMonth).length,
    };
  }, [events]);

  async function removeEvent(id: string) {
    if (!confirm("Удалить мероприятие?")) return;

    try {
      const response = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete event");
      }
      setEvents((current) => current.filter((event) => event.id !== id));
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  }

  function startCreate() {
    setEditingEvent(null);
    setViewMode("create");
  }

  function startEdit(event: EventApiItem) {
    setEditingEvent(event);
    setViewMode("edit");
  }

  function handleSaved() {
    setEditingEvent(null);
    setViewMode("list");
    fetchEvents();
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-stone-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </span>
            Мероприятия
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Управление событиями, которые отображаются на главной странице в календаре.
          </p>
        </div>

        {viewMode === "list" ? (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            <Plus className="h-4 w-4" />
            Добавить мероприятие
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              setViewMode("list");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            <ArrowLeft className="h-4 w-4" />
            К списку
          </button>
        )}
      </div>

      {viewMode === "list" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Всего событий" value={stats.total} />
            <StatCard label="Предстоящие" value={stats.upcoming} color="emerald" />
            <StatCard label="В этом месяце" value={stats.currentMonth} color="primary" />
          </div>

          {loading ? (
            <div className="flex justify-center rounded-2xl border border-stone-200 bg-white p-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-800" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <CalendarDays className="h-8 w-8 text-primary/60" />
              </div>
              <div className="text-xl font-semibold text-stone-900">Пока нет мероприятий</div>
              <div className="mx-auto mt-2 max-w-md text-sm text-stone-500">
                Создайте первое событие, чтобы оно появилось на главной странице в блоке календаря.
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="divide-y divide-stone-100">
                {events.map((event) => (
                  <article key={event.id} className="p-5 transition-colors hover:bg-stone-50/70">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-stone-900">{event.title}</div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                            {formatDateUTC(event.eventDate, "d MMM yyyy")}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-stone-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="h-4 w-4" />
                            {event.organizer}
                          </span>
                          <span className="text-stone-300">•</span>
                          <span>{format(new Date(event.createdAt), "d MMM yyyy", { locale: ru })}</span>
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
                            Перейти к странице мероприятия
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(event)}
                          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
                        >
                          <Pencil className="h-4 w-4" />
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEvent(event.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Удалить
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EventForm event={editingEvent} onCancel={() => setViewMode("list")} onSaved={handleSaved} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "primary" | "emerald";
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="text-sm font-medium text-stone-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${color === "emerald" ? "text-emerald-600" : color === "primary" ? "text-primary" : "text-stone-900"}`}>
        {value}
      </div>
    </div>
  );
}

function EventForm({
  event,
  onCancel,
  onSaved,
}: {
  event: EventApiItem | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(event);
  const [title, setTitle] = useState(event?.title || "");
  const [organizer, setOrganizer] = useState(event?.organizer || "");
  const [description, setDescription] = useState(event?.description || "");
  const [linkUrl, setLinkUrl] = useState(event?.linkUrl || "");
  const [eventDate, setEventDate] = useState(event?.eventDate.slice(0, 10) || format(new Date(), "yyyy-MM-dd"));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: title.trim(),
        organizer: organizer.trim(),
        description: description.trim() || null,
        linkUrl: linkUrl.trim() || null,
        eventDate: new Date(`${eventDate}T00:00:00.000Z`).toISOString(),
      };

      const response = await fetch(isEditing ? `/api/admin/events/${event?.id}` : "/api/admin/events", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save event");
      }

      onSaved();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 bg-stone-50/60 px-6 py-5">
          <div className="text-lg font-semibold text-stone-900">
            {isEditing ? "Редактирование мероприятия" : "Новое мероприятие"}
          </div>
        </div>

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Заголовок</label>
              <input
                type="text"
                value={title}
                onChange={(inputEvent) => setTitle(inputEvent.target.value)}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Например, Vet Forum 2026"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">Организатор</label>
              <input
                type="text"
                value={organizer}
                onChange={(inputEvent) => setOrganizer(inputEvent.target.value)}
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Название организации"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Дата</label>
            <input
              type="date"
              value={eventDate}
              onChange={(inputEvent) => setEventDate(inputEvent.target.value)}
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Ссылка на мероприятие</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(inputEvent) => setLinkUrl(inputEvent.target.value)}
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="https://example.com/event"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Описание</label>
            <textarea
              value={description}
              onChange={(inputEvent) => setDescription(inputEvent.target.value)}
              className="min-h-40 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm leading-6 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Краткое описание программы, формата или аудитории мероприятия"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-stone-200 px-6 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          {saving ? "Сохранение..." : isEditing ? "Сохранить изменения" : "Создать мероприятие"}
        </button>
      </div>
    </form>
  );
}

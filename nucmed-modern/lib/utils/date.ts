import { format } from "date-fns";
import { ru } from "date-fns/locale";

/**
 * Format a date in UTC to avoid hydration mismatch between server (UTC) and client (local TZ).
 * React error #418 occurs when server-rendered text differs from client hydration.
 */
export function formatDateUTC(date: Date | string | null | undefined, formatStr: string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  // Shift the date by the timezone offset so `format()` (which uses local TZ) produces UTC output.
  const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60_000);
  return format(utc, formatStr, { locale: ru });
}

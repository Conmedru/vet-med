import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

type KeyName = "CRON_SECRET" | "ADMIN_API_KEY" | "INGEST_API_KEY";

function safeEqual(value: string | null, expected: string): boolean {
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Cron / script authorization: `Authorization: Bearer <CRON_SECRET>` or `x-api-key` equal to one
 * of the given keys. Fails closed: an unset secret never matches (no "Bearer undefined").
 */
export function isCronAuthorized(request: NextRequest, apiKeys: KeyName[] = ["ADMIN_API_KEY"]): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && safeEqual(request.headers.get("authorization"), `Bearer ${cronSecret}`)) {
    return true;
  }

  const apiKey = request.headers.get("x-api-key");
  return apiKeys.some((name) => {
    const expected = process.env[name];
    return !!expected && safeEqual(apiKey, expected);
  });
}

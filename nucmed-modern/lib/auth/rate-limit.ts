/**
 * Простой in-memory rate limiter (fixed window) для публичных auth-эндпоинтов
 * (login/register/forgot-password). Проект работает на одном инстансе без
 * Redis (см. lib/ai/rate-limiter.ts — там аналогичный подход через Prisma
 * для AI-квот; здесь нужна более лёгкая и быстрая защита от брутфорса,
 * персистентность не требуется — при перезапуске окно просто сбрасывается).
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Is the key over its limit, without counting this request (for failure-only counters) */
export function isRateLimited(key: string, limit: number): { limited: boolean; retryAfterMs: number } {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < Date.now()) return { limited: false, retryAfterMs: 0 };
  return { limited: bucket.count >= limit, retryAfterMs: bucket.resetAt - Date.now() };
}

/** Count one failure (e.g. a wrong password) */
export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count += 1;
  }
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

export function getClientIp(headers: Headers): string {
  // x-real-ip is set by our reverse proxy; the first x-forwarded-for entry can be forged by the client
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown"
  );
}

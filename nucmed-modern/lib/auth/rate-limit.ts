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

/**
 * Reserve one attempt (e.g. a password check) if the key is under its limit. Synchronous, so
 * concurrent requests cannot all pass the check before the first failure is recorded.
 * Give the attempt back with releaseAttempt when it succeeds.
 */
export function reserveAttempt(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
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

export function releaseAttempt(key: string): void {
  const bucket = buckets.get(key);
  if (bucket && bucket.count > 0) bucket.count -= 1;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Drop all counters whose key starts with the prefix (e.g. after a password reset) */
export function resetRateLimitPrefix(prefix: string): void {
  for (const key of buckets.keys()) {
    if (key.startsWith(prefix)) buckets.delete(key);
  }
}

/** Counter key for failed logins: per account, or per account + IP */
export function loginFailureKey(email: string, ip?: string): string {
  return ip ? `login-fail:${email}|ip:${ip}` : `login-fail:${email}|all`;
}

export function getClientIp(headers: Headers): string {
  // x-real-ip is set by our reverse proxy; the first x-forwarded-for entry can be forged by the client
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown"
  );
}

/**
 * Cron concurrency lock via SystemConfig table.
 *
 * Prevents overlapping runs of the same cron job when multiple triggers
 * fire simultaneously (Docker cron-runner + GitHub Actions + manual).
 *
 * Usage:
 *   const lock = await acquireCronLock("process", 300_000); // 5 min TTL
 *   if (!lock.acquired) {
 *     return NextResponse.json({ skipped: true, reason: "already running" });
 *   }
 *   try {
 *     // ... do work ...
 *   } finally {
 *     await releaseCronLock("process");
 *   }
 */

import { prisma } from "@/lib/prisma";

const LOCK_PREFIX = "cron_lock_";
const STALE_MS = 600_000; // 10 min — auto-release stale locks

export interface CronLockResult {
  acquired: boolean;
  reason?: string;
  lockedAt?: Date;
}

/**
 * Try to acquire a named cron lock.
 * Returns { acquired: true } on success, { acquired: false, reason } if already held.
 * Stale locks (older than staleMs) are automatically reclaimed.
 */
export async function acquireCronLock(
  name: string,
  staleMs: number = STALE_MS
): Promise<CronLockResult> {
  const key = `${LOCK_PREFIX}${name}`;
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - staleMs);

  try {
    // Upsert with conditional update — only acquire if not currently locked
    // or if the lock is stale.
    const existing = await prisma.systemConfig.findUnique({ where: { key } });

    if (existing) {
      const lockedAt = new Date(existing.value as string);
      if (lockedAt > staleThreshold) {
        return {
          acquired: false,
          reason: `already running since ${lockedAt.toISOString()}`,
          lockedAt,
        };
      }
      // Stale lock — reclaim it
      await prisma.systemConfig.update({
        where: { key },
        data: { value: now.toISOString() },
      });
      return { acquired: true, lockedAt: now };
    }

    // No existing lock — create one
    await prisma.systemConfig.create({
      data: { key, value: now.toISOString() },
    });
    return { acquired: true, lockedAt: now };
  } catch (error) {
    // If create failed due to race condition (unique constraint), someone
    // else just acquired it.
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return { acquired: false, reason: "race condition — another instance acquired the lock" };
    }
    // On other errors, fail open (allow execution) to avoid blocking pipeline
    console.error(`[CronLock] Error acquiring lock "${name}":`, error);
    return { acquired: true, reason: "lock error — proceeding without lock" };
  }
}

/**
 * Release a named cron lock.
 */
export async function releaseCronLock(name: string): Promise<void> {
  const key = `${LOCK_PREFIX}${name}`;
  try {
    await prisma.systemConfig.delete({ where: { key } });
  } catch {
    // Lock already released or never acquired — ignore
  }
}

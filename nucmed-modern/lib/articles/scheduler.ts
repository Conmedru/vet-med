import { prisma } from '../prisma';
import { ArticleStatus } from '@prisma/client';

// ~25–35 articles/day come in after the client journals were connected (DOAJ alone ≈ 12–15/day),
// so the old 10/day made the queue grow without end. No "backlog mode" on purpose: in
// onco-compass it released 175 articles in one day.
const DAILY_LIMIT = 40;
// Publishing window in Moscow time
const START_HOUR = 7;
const END_HOUR = 22;
const MIN_INTERVAL_MINUTES = Math.floor(((END_HOUR - START_HOUR) * 60) / DAILY_LIMIT); // ≈ 22 min
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3, no DST
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** UTC midnight of the Moscow calendar day of `date`, expressed as a real instant */
function moscowDayStart(date: Date): Date {
  const shifted = new Date(date.getTime() + MOSCOW_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - MOSCOW_OFFSET_MS);
}

function moscowHour(date: Date): number {
  return new Date(date.getTime() + MOSCOW_OFFSET_MS).getUTCHours();
}

function atMoscowHour(dayStart: Date, hour: number): Date {
  return new Date(dayStart.getTime() + hour * 60 * MINUTE_MS);
}

/**
 * Schedules a newly processed article for publishing.
 * Logic: spaced out (~22 min), daily limit (40), 07:00–22:00 Moscow time.
 */
export async function scheduleNewArticle(articleId: string) {
  const now = new Date();

  // 1. Next slot after the latest already scheduled article (or after now)
  const lastScheduled = await prisma.article.findFirst({
    where: {
      status: ArticleStatus.SCHEDULED,
      scheduledAt: { not: null },
    },
    orderBy: { scheduledAt: 'desc' },
    select: { scheduledAt: true },
  });

  const base = lastScheduled?.scheduledAt && lastScheduled.scheduledAt > now ? lastScheduled.scheduledAt : now;
  let nextSlot = new Date(base.getTime() + MIN_INTERVAL_MINUTES * MINUTE_MS);

  // 2. Adjust for business hours (07:00 - 22:00 Moscow)
  nextSlot = adjustForBusinessHours(nextSlot);

  // 3. Check daily limit for the target slot's day
  const finalSlot = await ensureDailyLimit(nextSlot);

  console.log(`[Scheduler] Scheduling article ${articleId} for ${finalSlot.toISOString()}`);

  return prisma.article.update({
    where: { id: articleId },
    data: {
      status: ArticleStatus.SCHEDULED,
      scheduledAt: finalSlot,
    },
  });
}

function adjustForBusinessHours(date: Date): Date {
  const hour = moscowHour(date);
  const dayStart = moscowDayStart(date);

  if (hour < START_HOUR) {
    // Too early, move to 07:00 today
    return atMoscowHour(dayStart, START_HOUR);
  }
  if (hour >= END_HOUR) {
    // Too late, move to 07:00 tomorrow
    return atMoscowHour(new Date(dayStart.getTime() + DAY_MS), START_HOUR);
  }
  return date;
}

async function ensureDailyLimit(date: Date): Promise<Date> {
  let currentSlot = new Date(date);

  while (true) {
    const dayStart = moscowDayStart(currentSlot);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS - 1);

    const count = await prisma.article.count({
      where: {
        OR: [
          { status: ArticleStatus.PUBLISHED, publishedAt: { gte: dayStart, lte: dayEnd } },
          { status: ArticleStatus.SCHEDULED, scheduledAt: { gte: dayStart, lte: dayEnd } },
        ],
      },
    });

    if (count < DAILY_LIMIT) {
      return currentSlot;
    }

    // Daily limit reached for this day, move to 07:00 next day
    currentSlot = atMoscowHour(new Date(dayStart.getTime() + DAY_MS), START_HOUR);
  }
}

import { prisma } from '../prisma';
import { ArticleStatus } from '@prisma/client';
import { addMinutes, setHours, setMinutes, startOfDay, isBefore, isAfter, addDays, max } from 'date-fns';

const DAILY_LIMIT = 10;
const MIN_INTERVAL_MINUTES = 90;
const START_HOUR = 7;
const END_HOUR = 22;

/**
 * Schedules a newly processed article for publishing.
 * Logic: Spaced out (90m), daily limit (10), 07:00-22:00 window.
 */
export async function scheduleNewArticle(articleId: string) {
  const now = new Date();
  let targetDate = startOfDay(now);

  // 1. Find the first available slot starting from now
  // We look for the latest scheduledAt for current and future days
  const lastScheduled = await prisma.article.findFirst({
    where: {
      status: ArticleStatus.SCHEDULED,
      scheduledAt: { not: null },
    },
    orderBy: { scheduledAt: 'desc' },
    select: { scheduledAt: true },
  });

  let nextSlot: Date;

  if (lastScheduled?.scheduledAt && isAfter(lastScheduled.scheduledAt, now)) {
    // There are already articles scheduled in the future
    nextSlot = addMinutes(lastScheduled.scheduledAt, MIN_INTERVAL_MINUTES);
  } else {
    // No future articles, start scheduling from now + interval
    nextSlot = addMinutes(now, MIN_INTERVAL_MINUTES);
  }

  // 2. Adjust for business hours (07:00 - 22:00)
  nextSlot = adjustForBusinessHours(nextSlot);

  // 3. Check daily limit for the target slot's day
  let finalSlot = await ensureDailyLimit(nextSlot);

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
  const hour = date.getHours();
  let adjusted = new Date(date);

  if (hour < START_HOUR) {
    // Too early, move to 07:00 today
    adjusted = setHours(setMinutes(adjusted, 0), START_HOUR);
  } else if (hour >= END_HOUR) {
    // Too late, move to 07:00 tomorrow
    adjusted = addDays(adjusted, 1);
    adjusted = setHours(setMinutes(adjusted, 0), START_HOUR);
  }

  return adjusted;
}

async function ensureDailyLimit(date: Date): Promise<Date> {
  let currentSlot = new Date(date);
  
  while (true) {
    const dayStart = startOfDay(currentSlot);
    const dayEnd = setHours(setMinutes(new Date(dayStart), 59), 23);

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
    currentSlot = addDays(dayStart, 1);
    currentSlot = setHours(setMinutes(currentSlot, 0), START_HOUR);
  }
}

import { PrismaClient, ArticleStatus } from '@prisma/client';
import { DAILY_LIMIT, END_HOUR, MIN_INTERVAL_MINUTES, START_HOUR, moscowDayStart } from '@/lib/articles/scheduler';

/**
 * Re-spaces the SCHEDULED queue after a change of the daily limit: keeps the order, puts the
 * articles every MIN_INTERVAL_MINUTES within START_HOUR–END_HOUR Moscow time, not more than
 * DAILY_LIMIT per day (articles already published that day count). The new limit alone applies
 * only to new articles, which queue up after the last scheduled one.
 *
 * Запуск:
 *   npx tsx scripts/respread-schedule.ts           # показать новые слоты по дням
 *   npx tsx scripts/respread-schedule.ts --apply   # записать
 */

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

async function publishedOn(dayStart: Date): Promise<number> {
  return prisma.article.count({
    where: { status: ArticleStatus.PUBLISHED, publishedAt: { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) } },
  });
}

async function main() {
  const queue = await prisma.article.findMany({
    where: { status: ArticleStatus.SCHEDULED },
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  });

  // First slot: the next interval step from now, inside the publishing window
  let day = moscowDayStart(new Date());
  let slot = new Date(Date.now() + MIN_INTERVAL_MINUTES * MINUTE_MS);
  let left = DAILY_LIMIT - (await publishedOn(day));
  const perDay = new Map<string, number>();
  const plan: { id: string; at: Date }[] = [];

  for (const article of queue) {
    for (;;) {
      const windowStart = new Date(day.getTime() + START_HOUR * 60 * MINUTE_MS);
      const windowEnd = new Date(day.getTime() + END_HOUR * 60 * MINUTE_MS);
      if (slot < windowStart) slot = windowStart;
      if (left > 0 && slot < windowEnd) break;
      day = new Date(day.getTime() + DAY_MS);
      slot = new Date(day.getTime() + START_HOUR * 60 * MINUTE_MS);
      left = DAILY_LIMIT - (await publishedOn(day));
    }
    plan.push({ id: article.id, at: slot });
    const key = new Date(day.getTime() + 3 * 60 * MINUTE_MS).toISOString().slice(0, 10);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
    slot = new Date(slot.getTime() + MIN_INTERVAL_MINUTES * MINUTE_MS);
    left--;
  }

  console.log(`Queue: ${queue.length}, limit ${DAILY_LIMIT}/day, every ${MIN_INTERVAL_MINUTES} min, ${apply ? 'APPLY' : 'dry run'}`);
  for (const [key, n] of perDay) console.log(`${key}: ${n}`);
  if (!apply) return;

  for (const { id, at } of plan) {
    await prisma.article.update({ where: { id }, data: { scheduledAt: at } });
  }
  console.log(`Rescheduled ${plan.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

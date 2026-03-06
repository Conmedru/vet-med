import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addMinutes, isBefore, isAfter, setHours, setMinutes, max } from "date-fns";

const MAX_ARTICLES_PER_DAY = 10;
const INTERVAL_MINUTES = 90;
const START_HOUR = 7;
const END_HOUR = 22;

export async function scheduleNewArticle(articleId: string) {
    let targetDate = new Date();
    let scheduledAt: Date | null = null;
    let attempts = 0;

    // Search for the next available slot within the next 7 days
    while (!scheduledAt && attempts < 7) {
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        // Count how many articles are already scheduled or published for this target day
        const count = await prisma.article.count({
            where: {
                OR: [
                    { status: "SCHEDULED", scheduledAt: { gte: dayStart, lte: dayEnd } },
                    { status: "PUBLISHED", publishedAt: { gte: dayStart, lte: dayEnd } }
                ]
            }
        });

        if (count < MAX_ARTICLES_PER_DAY) {
            // Find the latest scheduled article for this day to calculate the next slot
            const latestScheduled = await prisma.article.findFirst({
                where: {
                    status: "SCHEDULED",
                    scheduledAt: { gte: dayStart, lte: dayEnd }
                },
                orderBy: { scheduledAt: 'desc' },
                select: { scheduledAt: true }
            });

            // Find the latest published article for this day to calculate the next slot
            const latestPublished = await prisma.article.findFirst({
                where: {
                    status: "PUBLISHED",
                    publishedAt: { gte: dayStart, lte: dayEnd }
                },
                orderBy: { publishedAt: 'desc' },
                select: { publishedAt: true }
            });

            const now = new Date();

            // Determine base time
            let baseTime = dayStart;

            // If target day is today, base time is max(now, latest_scheduled, latest_published)
            if (dayStart.getTime() === startOfDay(now).getTime()) {
                baseTime = now;
            }

            if (latestScheduled?.scheduledAt) {
                baseTime = max([baseTime, latestScheduled.scheduledAt]);
            }

            if (latestPublished?.publishedAt) {
                baseTime = max([baseTime, latestPublished.publishedAt]);
            }

            // Propose a slot: base time + interval
            let proposedSlot = addMinutes(baseTime, INTERVAL_MINUTES);

            // Snap to bounds
            const dayStartBoundary = setMinutes(setHours(targetDate, START_HOUR), 0);
            const dayEndBoundary = setMinutes(setHours(targetDate, END_HOUR), 0);

            if (isBefore(proposedSlot, dayStartBoundary)) {
                proposedSlot = dayStartBoundary;
            }

            if (isBefore(proposedSlot, dayEndBoundary) || proposedSlot.getTime() === dayEndBoundary.getTime()) {
                scheduledAt = proposedSlot;
            }
        }

        if (!scheduledAt) {
            // Move to next day and retry
            targetDate = addMinutes(dayEnd, 1); // Jump to next day 00:00:01
            attempts++;
        }
    }

    if (!scheduledAt) {
        console.error(`[Scheduler] Could not find a slot for article ${articleId} within 7 days. Falling back to draft.`);
        await prisma.article.update({
            where: { id: articleId },
            data: { status: "DRAFT" }
        });
        return false;
    }

    console.log(`[Scheduler] Scheduling article ${articleId} for ${scheduledAt.toISOString()}`);
    await prisma.article.update({
        where: { id: articleId },
        data: {
            status: "SCHEDULED",
            scheduledAt
        }
    });

    return true;
}

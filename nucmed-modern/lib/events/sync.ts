import { prisma } from "@/lib/prisma";
import { EVENT_SCRAPERS, type ScrapedEvent } from "./scrapers";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_AHEAD = 400;

// Organizers' own sites first: their copy of an event wins over the aggregators' one
const PRIORITY = ["proplan", "avzvet", "avc", "expomap", "zooinform"];

// Farm animals (incl. horses, as in the farm-animals rubric) are out of scope for events:
// agro fairs, livestock, poultry, feed production, equestrian shows
const FARM_EVENT =
  /сельскохоз|сельского хоз|агро|\bagr[oi]|животновод|птицевод|свиновод|скотовод|\bкрс\b|cattle|livestock|poultry|\bpigs?\b|swine|dairy|молочн|мясн|кормопроизвод|feed tech|грэйн|зоотехн|zootecn|\bferma\b|\bfarm|ildex|растениевод|лошад|конн|конск|\bequi(ta|tana|ne|ster)|equestr|cheval|pferd|horse|cavali|hippolog|sicab|riding/i;

export function isFarmEvent(event: { title: string; description: string | null }): boolean {
  return FARM_EVENT.test(`${event.title} ${event.description || ""}`);
}

/** Title words for duplicate detection: lowercase, ё→е, no punctuation, no years */
function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .split(" ")
    .filter((w) => w.length > 1);
}

/** Same start day and the same name (one contains the other, or most words match) */
function isSameEvent(a: { eventDate: Date; title: string }, b: { eventDate: Date; title: string }): boolean {
  if (a.eventDate.getTime() !== b.eventDate.getTime()) return false;
  const wa = titleWords(a.title);
  const wb = titleWords(b.title);
  if (wa.length === 0 || wb.length === 0) return false;
  const ja = wa.join(" ");
  const jb = wb.join(" ");
  if (ja.includes(jb) || jb.includes(ja)) return true;
  const setB = new Set(wb);
  const common = wa.filter((w) => setB.has(w)).length;
  return common / Math.max(wa.length, wb.length) >= 0.6;
}

export interface EventSyncResult {
  source: string;
  fetched: number;
  created: number;
  updated: number;
  duplicates: number;
  /** Farm-animal events, not imported */
  skipped: number;
  error?: string;
}

/** Scrape all event sources and upsert upcoming events into the events table */
export async function syncScrapedEvents(): Promise<EventSyncResult[]> {
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const horizon = new Date(today.getTime() + MAX_DAYS_AHEAD * DAY_MS);

  const scrapers = [...EVENT_SCRAPERS].sort((a, b) => PRIORITY.indexOf(a.sourceType) - PRIORITY.indexOf(b.sourceType));

  // Known upcoming events of all sources (manual ones included) for duplicate detection
  const known = await prisma.event.findMany({
    where: { isActive: true, eventDate: { gte: new Date(today.getTime() - 7 * DAY_MS) } },
    select: { id: true, title: true, eventDate: true, sourceType: true, externalId: true },
  });

  const results: EventSyncResult[] = [];

  for (const scraper of scrapers) {
    const result: EventSyncResult = { source: scraper.sourceType, fetched: 0, created: 0, updated: 0, duplicates: 0, skipped: 0 };
    results.push(result);

    let events: ScrapedEvent[];
    try {
      events = await scraper.scrape();
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`[Events] ${scraper.name} failed:`, result.error);
      continue;
    }

    const upcoming = events.filter((e) => (e.endDate ?? e.eventDate) >= today && e.eventDate <= horizon);
    result.fetched = upcoming.length;

    // Hide farm events stored before the filter existed (editor's decisions are kept)
    const farmIds = upcoming.filter(isFarmEvent).map((e) => e.externalId);
    if (farmIds.length > 0) {
      await prisma.event.updateMany({
        where: { sourceType: scraper.sourceType, externalId: { in: farmIds }, isActive: true, manualEditedAt: null },
        data: { isActive: false },
      });
    }

    for (const event of upcoming) {
      if (isFarmEvent(event)) {
        result.skipped++;
        continue;
      }

      const own = known.find((k) => k.sourceType === scraper.sourceType && k.externalId === event.externalId);
      if (!own && known.some((k) => isSameEvent(k, event))) {
        result.duplicates++;
        continue;
      }

      const data = {
        title: event.title,
        eventDate: event.eventDate,
        endDate: event.endDate && event.endDate > event.eventDate ? event.endDate : null,
        location: event.location,
        isOnline: event.isOnline,
        linkUrl: event.linkUrl,
        organizer: event.organizer,
        description: event.description,
      };

      try {
        const existing = await prisma.event.findUnique({
          where: { sourceType_externalId: { sourceType: scraper.sourceType, externalId: event.externalId } },
          select: { id: true, manualEditedAt: true },
        });
        if (existing) {
          // Editor's changes win over the scraper
          if (!existing.manualEditedAt) {
            await prisma.event.update({ where: { id: existing.id }, data });
            result.updated++;
          }
        } else {
          const created = await prisma.event.create({
            data: { ...data, sourceType: scraper.sourceType, externalId: event.externalId },
            select: { id: true, title: true, eventDate: true, sourceType: true, externalId: true },
          });
          known.push(created);
          result.created++;
        }
      } catch (error) {
        console.error(`[Events] ${scraper.name}: failed to save "${event.title}":`, error);
      }
    }

    console.log(
      `[Events] ${scraper.name}: ${result.fetched} upcoming, ${result.created} new, ${result.updated} updated, ${result.duplicates} duplicates, ${result.skipped} farm skipped`
    );
  }

  return results;
}

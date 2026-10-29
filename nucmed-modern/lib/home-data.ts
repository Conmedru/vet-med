import { prisma } from "@/lib/prisma";
import {
  NOT_FARM_ONLY,
  getArticleStats,
  getArticlesByRubrics,
  getEditorialFeaturedArticles,
  getPublishedArticles,
  type DBArticle,
} from "@/lib/articles";
import { getCurrentMonthKey, listEventsByMonth } from "@/lib/events";
import { GUIDELINE_GROUPS } from "@/lib/guidelines";
import { CALCULATOR_SOURCES } from "@/lib/calculators";
import type { EventApiItem } from "@/lib/schemas/events";
import type { VetDate } from "@/lib/vet-dates";

/** Data for the home page: lead stories, topic rails, events, references */

function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

async function getRubricCounts(): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<{ rubric: string; count: bigint }[]>`
    SELECT r AS rubric, count(*) AS count
    FROM (SELECT unnest(a."rubrics") AS r FROM "articles" a WHERE a."status" = 'PUBLISHED' AND ${NOT_FARM_ONLY}) t
    GROUP BY r
  `;
  return Object.fromEntries(rows.map((row) => [row.rubric, Number(row.count)]));
}

export interface HomeData {
  articles: DBArticle[];
  featured: DBArticle;
  stats: { total: number; thisWeek: number; thisMonth: number };
  counts: Record<string, number>;
  pets: DBArticle[];
  diagnostics: DBArticle[];
  specialties: DBArticle[];
  events: EventApiItem[];
  vetDates: VetDate[];
  guidelines: { title: string; url: string; year?: number; group: string }[];
  calculators: { title: string; description: string; url: string; source: string }[];
}

export async function loadHomeData(): Promise<HomeData | null> {
  const month = getCurrentMonthKey();
  const [articles, featured, stats, counts, pets, diagnostics, specialties, thisMonth, nextMonth] = await Promise.all([
    getPublishedArticles(20),
    getEditorialFeaturedArticles(),
    getArticleStats(),
    getRubricCounts(),
    getArticlesByRubrics(["dogs", "cats", "rodents", "birds", "exotics"], 6),
    getArticlesByRubrics(["ultrasound", "radiology", "lab-diagnostics", "histology", "genetics"], 6),
    getArticlesByRubrics(["oncology", "neurology", "cardiology", "endocrinology", "surgery", "dermatology"], 6),
    listEventsByMonth(month),
    listEventsByMonth(nextMonthKey(month)),
  ]);
  if (articles.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();
  const events = [...thisMonth.events, ...nextMonth.events]
    .filter((e) => (e.endDate || e.eventDate).slice(0, 10) >= today && !seen.has(e.id) && seen.add(e.id))
    .slice(0, 4);
  const vetDates = [...thisMonth.vetDates, ...nextMonth.vetDates].filter((d) => d.date >= today).slice(0, 5);

  const guidelines = GUIDELINE_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ title: item.title, url: item.url, year: item.year, group: group.id.toUpperCase() }))
  ).slice(0, 5);
  const calculators = CALCULATOR_SOURCES.flatMap((source) =>
    source.items.map((item) => ({ title: item.title, description: item.description, url: item.url, source: source.name }))
  ).slice(0, 6);

  return {
    articles,
    featured: featured[0] || articles[0],
    stats,
    counts,
    pets,
    diagnostics,
    specialties,
    events,
    vetDates,
    guidelines,
    calculators,
  };
}

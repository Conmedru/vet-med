import Link from "next/link";
import { X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/ui/pagination-custom";
import { NewsList, NewsFilters } from "@/components/articles";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vetmed.ru";

export const metadata: Metadata = {
  title: "Новости ветеринарной медицины | VetMed",
  description: "Последние новости, исследования и клинические случаи в области ветеринарной медицины: хирургия, терапия, онкология, кардиология и другие специальности.",
  openGraph: {
    title: "Новости ветеринарной медицины",
    description: "Последние новости, исследования и клинические случаи ветеринарной медицины.",
    url: `${SITE_URL}/news`,
    siteName: "VetMed",
    locale: "ru_RU",
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/news`,
  },
};

type ArticleWithTags = {
  id: string;
  slug: string | null;
  title: string | null;
  titleOriginal: string;
  excerpt: string | null;
  category: string | null;
  tags: string[] | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  originalPublishedAt: Date | null;
  createdAt: Date;
  sourceId: string | null;
  source: { id: string; name: string; slug: string } | null;
};

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const PAGE_SIZE = 10;

// Calculate date range from period preset
function getDateRange(period?: string, from?: string, to?: string) {
  if (from || to) {
    return {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
    };
  }

  if (!period || period === "all") return undefined;

  const now = new Date();
  switch (period) {
    case "today":
      const today = new Date(now.setHours(0, 0, 0, 0));
      return { gte: today };
    case "week":
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      return { gte: weekAgo };
    case "month":
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
      return { gte: monthAgo };
    default:
      return undefined;
  }
}

// No unstable_cache - coverImageUrl contains Base64 which exceeds 2MB cache limit
// Sorting logic:
// - Use originalPublishedAt (date from source) when available
// - Fall back to publishedAt (our publication date), then createdAt
async function getPublishedArticles(
  page: number,
  tag?: string,
  category?: string,
  sort: string = "newest",
  period?: string,
  from?: string,
  to?: string
) {
  const skip = (page - 1) * PAGE_SIZE;
  const dateRange = getDateRange(period, from, to);
  const sortDirection = sort === "oldest" ? "ASC" : "DESC";

  // Build WHERE conditions
  const conditions: string[] = [`a."status" = 'PUBLISHED'`];
  const params: any[] = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`a."category" = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  if (tag) {
    conditions.push(`$${paramIndex} = ANY(a."tags")`);
    params.push(tag);
    paramIndex++;
  }

  if (dateRange) {
    // Filter by effective date (originalPublishedAt -> publishedAt -> createdAt)
    if (dateRange.gte) {
      conditions.push(`COALESCE(a."originalPublishedAt", a."publishedAt", a."createdAt") >= $${paramIndex}`);
      params.push(dateRange.gte);
      paramIndex++;
    }
    if (dateRange.lte) {
      conditions.push(`COALESCE(a."originalPublishedAt", a."publishedAt", a."createdAt") <= $${paramIndex}`);
      params.push(dateRange.lte);
      paramIndex++;
    }
  }

  const whereClause = conditions.join(" AND ");

  // Query with COALESCE for proper date sorting
  const articlesQuery = `
    SELECT 
      a."id",
      a."slug",
      a."title",
      a."titleOriginal",
      a."excerpt",
      a."category",
      a."tags",
      a."coverImageUrl",
      a."publishedAt",
      a."originalPublishedAt",
      a."createdAt",
      a."sourceId",
      json_build_object('id', s."id", 'name', s."name", 'slug', s."slug") as source
    FROM "articles" a
    LEFT JOIN "sources" s ON a."sourceId" = s."id"
    WHERE ${whereClause}
    ORDER BY COALESCE(a."originalPublishedAt", a."publishedAt", a."createdAt") ${sortDirection} NULLS LAST
    LIMIT ${PAGE_SIZE}
    OFFSET ${skip}
  `;

  const countQuery = `
    SELECT COUNT(*) as count
    FROM "articles" a
    WHERE ${whereClause}
  `;

  const [articles, countResult] = await Promise.all([
    prisma.$queryRawUnsafe<ArticleWithTags[]>(articlesQuery, ...params),
    prisma.$queryRawUnsafe<[{ count: bigint }]>(countQuery, ...params),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return { articles, total };
}

// Fetch filter options
async function getFilterOptions() {
    const [categories, tagsResult] = await Promise.all([
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: { category: true },
        distinct: ["category"],
      }),
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: { tags: true },
      })
    ]);

    // Count tag frequency and get top 20 popular tags
    const tagCounts = new Map<string, number>();
    tagsResult.forEach(article => {
      article.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const popularTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);

    return {
      categories: categories.map(c => c.category).filter(Boolean) as string[],
      popularTags
    };
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    tag?: string;
    category?: string;
    sort?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const tagFilter = params.tag ? decodeURIComponent(params.tag) : undefined;
  const categoryFilter = params.category ? decodeURIComponent(params.category) : undefined;
  const sortOrder = params.sort || "newest";
  const periodFilter = params.period;
  const fromDate = params.from;
  const toDate = params.to;

  const [data, filterOptions] = await Promise.all([
    getPublishedArticles(currentPage, tagFilter, categoryFilter, sortOrder, periodFilter, fromDate, toDate),
    getFilterOptions()
  ]);

  const { articles, total } = data;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container py-8 md:py-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight mb-2">
          Новости ветеринарной медицины
        </h1>
        <p className="text-muted-foreground">
          {total > 0
            ? `Найдено ${total} ${total === 1 ? "публикация" : total < 5 ? "публикации" : "публикаций"}`
            : "Последние публикации, исследования и открытия"
          }
        </p>
      </div>

      {/* Filter controls */}
      <div className="mb-8">
        <NewsFilters
          options={filterOptions}
          currentFilters={{
            tag: tagFilter,
            category: categoryFilter,
            sort: sortOrder,
            period: periodFilter,
            from: fromDate,
            to: toDate
          }}
        />
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Статьи не найдены</p>
          <p className="text-sm mt-2">Попробуйте изменить параметры поиска или сбросить фильтры</p>
        </div>
      ) : (
        <div className="space-y-8">
          <NewsList articles={articles} />

          <div className="pt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl="/news"
            />
          </div>
        </div>
      )}
    </div>
  );
}

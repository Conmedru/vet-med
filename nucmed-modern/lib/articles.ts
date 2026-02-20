import { prisma } from "@/lib/prisma";
import { PAGINATION, CACHE, CONTENT } from "@/lib/config";

/**
 * Article data for card components and lists
 */
export interface DBArticle {
  id: string;
  slug: string | null;
  title: string | null;
  titleOriginal: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  tags: string[];
  coverImageUrl: string | null;
  publishedAt: Date | null;
  originalPublishedAt: Date | null;
  createdAt: Date;
  significanceScore: number | null;
  source: {
    name: string;
    slug: string;
  } | null;
}

const articleSelect = {
  id: true,
  slug: true,
  title: true,
  titleOriginal: true,
  excerpt: true,
  content: true,
  category: true,
  tags: true,
  coverImageUrl: true,
  publishedAt: true,
  originalPublishedAt: true,
  createdAt: true,
  significanceScore: true,
  source: { select: { name: true, slug: true } },
} as const;

// Base64 images are too large for Next.js Data Cache (2MB limit),
// so we disable caching for list fetching functions until S3 is configured.

// Sorting logic:
// - Use originalPublishedAt (date from original source) when available
// - Fall back to publishedAt (our publication date) for manual/new articles
export const getPublishedArticles = async (limit: number = PAGINATION.SIDEBAR_ARTICLES) => {
  try {
    const articles = await prisma.$queryRaw<DBArticle[]>`
      SELECT 
        a."id",
        a."slug",
        a."title",
        a."titleOriginal",
        a."excerpt",
        a."content",
        a."category",
        a."tags",
        a."coverImageUrl",
        a."publishedAt",
        a."originalPublishedAt",
        a."createdAt",
        a."significanceScore",
        json_build_object('name', s."name", 'slug', s."slug") as source
      FROM "articles" a
      LEFT JOIN "sources" s ON a."sourceId" = s."id"
      WHERE a."status" = 'PUBLISHED'
      ORDER BY COALESCE(a."originalPublishedAt", a."publishedAt", a."createdAt") DESC NULLS LAST
      LIMIT ${limit}
    `;
    return articles;
  } catch (error) {
    console.error("Failed to fetch published articles:", error);
    return [];
  }
};

export const getArticlesByCategory = async (category: string, limit = 50) => {
  try {
    const articles = await prisma.$queryRaw<DBArticle[]>`
      SELECT 
        a."id",
        a."slug",
        a."title",
        a."titleOriginal",
        a."excerpt",
        a."content",
        a."category",
        a."tags",
        a."coverImageUrl",
        a."publishedAt",
        a."originalPublishedAt",
        a."createdAt",
        a."significanceScore",
        json_build_object('name', s."name", 'slug', s."slug") as source
      FROM "articles" a
      LEFT JOIN "sources" s ON a."sourceId" = s."id"
      WHERE a."status" = 'PUBLISHED' AND LOWER(a."category") = LOWER(${category})
      ORDER BY COALESCE(a."originalPublishedAt", a."publishedAt", a."createdAt") DESC NULLS LAST
      LIMIT ${limit}
    `;
    return articles;
  } catch (error) {
    console.error("Failed to fetch articles by category:", error);
    return [];
  }
};

export const getFeaturedArticles = async (limit = PAGINATION.FEATURED_ARTICLES) => {
  try {
    const minScore = CONTENT.MIN_SIGNIFICANCE_SCORE;
    const articles = await prisma.$queryRaw<DBArticle[]>`
      SELECT 
        a."id",
        a."slug",
        a."title",
        a."titleOriginal",
        a."excerpt",
        a."content",
        a."category",
        a."tags",
        a."coverImageUrl",
        a."publishedAt",
        a."originalPublishedAt",
        a."createdAt",
        a."significanceScore",
        json_build_object('name', s."name", 'slug', s."slug") as source
      FROM "articles" a
      LEFT JOIN "sources" s ON a."sourceId" = s."id"
      WHERE a."status" = 'PUBLISHED' AND a."significanceScore" >= ${minScore}
      ORDER BY a."significanceScore" DESC, COALESCE(a."originalPublishedAt", a."publishedAt", a."createdAt") DESC NULLS LAST
      LIMIT ${limit}
    `;
    return articles;
  } catch (error) {
    console.error("Failed to fetch featured articles:", error);
    return [];
  }
};

export const getTrendingArticles = async (limit = PAGINATION.TRENDING_ARTICLES) => {
  try {
    const articles = await prisma.$queryRaw<DBArticle[]>`
      SELECT 
        a."id",
        a."slug",
        a."title",
        a."titleOriginal",
        a."excerpt",
        a."content",
        a."category",
        a."tags",
        a."coverImageUrl",
        a."publishedAt",
        a."originalPublishedAt",
        a."createdAt",
        a."significanceScore",
        json_build_object('name', s."name", 'slug', s."slug") as source
      FROM "articles" a
      LEFT JOIN "sources" s ON a."sourceId" = s."id"
      WHERE a."status" = 'PUBLISHED'
      ORDER BY COALESCE(a."publishedAt", a."createdAt") DESC NULLS LAST
      LIMIT ${limit}
    `;
    return articles;
  } catch (error) {
    console.error("Failed to fetch trending articles:", error);
    return [];
  }
};

export async function getArticleStats() {
    try {
      const [total, thisWeek, thisMonth, categories] = await Promise.all([
        prisma.article.count({ where: { status: "PUBLISHED" } }),
        prisma.article.count({
          where: {
            status: "PUBLISHED",
            publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.article.count({
          where: {
            status: "PUBLISHED",
            publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.article.groupBy({
          by: ["category"],
          where: { status: "PUBLISHED", category: { not: null } },
          _count: true,
        }),
      ]);

      return {
        total,
        thisWeek,
        thisMonth,
        categories: categories.map((c: { category: string | null; _count: number }) => ({ 
          name: c.category as string, 
          count: c._count 
        })),
      };
    } catch (error) {
      console.error("Failed to fetch article stats:", error);
      return { total: 0, thisWeek: 0, thisMonth: 0, categories: [] };
    }
}

export function estimateReadingTime(content: string | null): string {
  if (!content) return "1 мин";
  const wordsPerMinute = CONTENT.WORDS_PER_MINUTE;
  const words = content.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} мин`;
}

export function getArticleUrl(article: DBArticle): string {
  return `/news/${article.slug || article.id}`;
}

export async function getTrendingTags(limit = 10) {
    try {
      const articles = await prisma.article.findMany({
        where: { 
          status: "PUBLISHED",
          tags: { isEmpty: false },
        },
        select: { tags: true },
        take: 100,
      });
      
      // Count tag frequency
      const tagCounts = new Map<string, number>();
      articles.forEach((article: { tags: string[] }) => {
        article.tags.forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });
      
      // Sort by frequency and return top tags
      const sortedTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag]) => tag);
      
      return sortedTags;
    } catch (error) {
      console.error("Failed to fetch trending tags:", error);
      return [];
    }
}

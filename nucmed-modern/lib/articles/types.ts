/**
 * Article types for the application
 */

/**
 * Article source info
 */
export interface ArticleSource {
  name: string;
  slug: string;
}

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
  createdAt: Date;
  significanceScore: number | null;
  source: ArticleSource | null;
}

/**
 * Article stats
 */
export interface ArticleStats {
  total: number;
  thisWeek: number;
  categories: { name: string; count: number }[];
}

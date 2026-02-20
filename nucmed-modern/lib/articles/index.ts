/**
 * Articles module - centralized article queries and utilities
 * 
 * Usage:
 *   import { getPublishedArticles, DBArticle } from "@/lib/articles";
 */

// Re-export types
export type { DBArticle, ArticleSource, ArticleStats } from "./types";

// Re-export utilities
export { estimateReadingTime, getArticleUrl, getArticleTitle, getArticleDate } from "./utils";

// Re-export queries from main file (for backward compatibility)
export {
  getPublishedArticles,
  getArticlesByCategory,
  getFeaturedArticles,
  getTrendingArticles,
  getArticleStats,
  getTrendingTags,
} from "../articles";

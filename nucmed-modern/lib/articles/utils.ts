import { CONTENT } from "@/lib/config";
import type { DBArticle } from "./types";

/**
 * Estimate reading time for article content
 */
export function estimateReadingTime(content: string | null): string {
  if (!content) return "1 мин";
  const wordsPerMinute = CONTENT.WORDS_PER_MINUTE;
  const words = content.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} мин`;
}

/**
 * Get article URL path
 */
export function getArticleUrl(article: DBArticle | { id: string }): string {
  return `/news/${article.id}`;
}

/**
 * Get display title for article
 */
export function getArticleTitle(article: { title: string | null; titleOriginal: string }): string {
  return article.title || article.titleOriginal;
}

/**
 * Get display date for article
 */
export function getArticleDate(article: { publishedAt: Date | null; createdAt: Date }): Date {
  return article.publishedAt || article.createdAt;
}

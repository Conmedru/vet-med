import type { ArticleStatus } from "@prisma/client";

/**
 * Base article type matching Prisma schema
 */
export interface Article {
  id: string;
  slug: string | null;
  sourceId: string;
  externalId: string;
  externalUrl: string;
  titleOriginal: string;
  contentOriginal: string;
  excerptOriginal: string | null;
  title: string | null;
  content: string | null;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  significanceScore: number | null;
  language: string;
  authors: string[];
  coverImageUrl: string | null;
  status: ArticleStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  aiModel: string | null;
  aiPromptVersion: string | null;
  processingCostUsd: number | null;
  processingError: string | null;
  originalPublishedAt: Date | null;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  contentHash: string | null;
  viewCount: number;
}

/**
 * Article with source relation - used in most frontend queries
 */
export interface ArticleWithSource {
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
 * Minimal article source info
 */
export interface ArticleSource {
  id: string;
  name: string;
  slug: string;
}

/**
 * Article for list views (news page, category page)
 */
export interface ArticleListItem {
  id: string;
  title: string | null;
  titleOriginal: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  sourceId: string | null;
  source: ArticleSource | null;
}

/**
 * Article for card components
 */
export interface ArticleCardData {
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
 * Full article for detail page
 */
export interface ArticleDetail extends ArticleWithSource {
  externalUrl: string | null;
  authors: string[];
  images: ArticleImage[];
}

/**
 * Article image
 */
export interface ArticleImage {
  id: string;
  originalUrl: string;
  storedUrl: string | null;
  thumbnailSmUrl: string | null;
  thumbnailMdUrl: string | null;
  thumbnailLgUrl: string | null;
  caption: string | null;
  isCover: boolean;
  width: number | null;
  height: number | null;
}

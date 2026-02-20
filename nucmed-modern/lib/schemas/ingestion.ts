import { z } from "zod";

/**
 * Unified Ingestion Schema
 * ВСЕ парсеры ОБЯЗАНЫ отправлять данные в этом формате
 */

export const ImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  isCover: z.boolean().default(false),
});

export const IngestedArticleSchema = z.object({
  // === ИДЕНТИФИКАЦИЯ (обязательно) ===
  sourceId: z.string().min(1, "sourceId is required"), // "medicalxpress"
  externalId: z.string().min(1, "externalId is required"), // Уникальный ID
  externalUrl: z.string().url("externalUrl must be a valid URL"),

  // === КОНТЕНТ (обязательно) ===
  title: z.string().min(1, "title is required"),
  contentHtml: z.string().min(1, "contentHtml is required"),
  excerpt: z.string().optional(),

  // === ВРЕМЯ ===
  publishedAt: z.string().datetime().optional(), // ISO 8601
  scrapedAt: z.string().datetime().optional(),

  // === МЕДИА ===
  images: z.array(ImageSchema).default([]),

  // === МЕТАДАННЫЕ ===
  authors: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional(),
  language: z.string().default("en"),

  // === СЫРЫЕ ДАННЫЕ ===
  rawMetadata: z.record(z.string(), z.unknown()).optional(),
});

export type IngestedArticle = z.infer<typeof IngestedArticleSchema>;
export type IngestedImage = z.infer<typeof ImageSchema>;

/**
 * Batch ingestion - для загрузки нескольких статей за раз
 */
export const BatchIngestSchema = z.object({
  articles: z.array(IngestedArticleSchema).min(1).max(100),
  sourceSlug: z.string().min(1), // Для валидации что все статьи от одного источника
});

export type BatchIngest = z.infer<typeof BatchIngestSchema>;

/**
 * Response schemas
 */
export const IngestResultSchema = z.object({
  success: z.boolean(),
  articleId: z.string().optional(),
  status: z.enum(["created", "duplicate", "error"]),
  message: z.string().optional(),
});

export type IngestResult = z.infer<typeof IngestResultSchema>;

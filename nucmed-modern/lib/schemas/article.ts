import { z } from "zod";
import { CATEGORIES } from "@/lib/config/constants";

export { CATEGORIES };

/**
 * Validation schemas for Article API
 */

export const ArticleStatusEnum = z.enum([
  "INGESTED",
  "PROCESSING",
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
  "FAILED",
]);

export type ArticleStatus = z.infer<typeof ArticleStatusEnum>;

/**
 * Schema for updating article (PATCH)
 */
export const ArticleUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.preprocess((val) => val === "" ? null : val, z.string().max(1000).optional().nullable()),
  // Relaxed validation to allow legacy categories during migration
  category: z.preprocess((val) => val === "" ? null : val, z.string().optional().nullable()),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  coverImageUrl: z.preprocess((val) => val === "" ? null : val, z.string().url().optional().nullable()),
  scheduledAt: z.preprocess((val) => val === "" ? null : val, z.coerce.date().optional().nullable()),
  publishedAt: z.preprocess((val) => val === "" ? null : val, z.coerce.date().optional().nullable()),
  originalPublishedAt: z.preprocess((val) => val === "" ? null : val, z.coerce.date().optional().nullable()),
  status: ArticleStatusEnum.optional(),
  significanceScore: z.preprocess((val) => val === "" ? null : val, z.coerce.number().int().min(1).max(10).optional().nullable()),
}).strict(); // Reject unknown fields

export type ArticleUpdate = z.infer<typeof ArticleUpdateSchema>;

/**
 * Schema for publishing article
 */
export const ArticlePublishSchema = z.object({
  scheduledAt: z.string().datetime().optional(), // If provided, schedule instead of immediate publish
});

export type ArticlePublish = z.infer<typeof ArticlePublishSchema>;

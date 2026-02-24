import { z } from "zod";

export const AdapterTypeSchema = z.enum(["rss", "html", "playwright"]);

const AdapterConfigSchema = z
  .record(z.string(), z.unknown())
  .and(
    z.object({
      version: z.number().int().min(1).optional(),
    })
  );

export const SourceUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(300),
    url: z.string().trim().url(),
    adapterType: AdapterTypeSchema,
    adapterConfig: AdapterConfigSchema,
    isActive: z.boolean(),
    scrapeIntervalMinutes: z.number().int().min(5).max(10080),
  })
  .strict();

export const SourcePreviewRequestSchema = z
  .object({
    limit: z.number().int().min(1).max(20).optional().default(5),
    url: z.string().trim().url().optional(),
    adapterType: AdapterTypeSchema.optional(),
    adapterConfig: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const SourcePreviewItemSchema = z.object({
  externalId: z.string(),
  externalUrl: z.string(),
  title: z.string(),
  publishedAt: z.string().datetime().nullable(),
  imageCount: z.number().int().nonnegative(),
  hasCover: z.boolean(),
});

export const SourcePreviewResponseSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  adapterType: AdapterTypeSchema,
  configVersion: z.number().int().min(1),
  durationMs: z.number().int().nonnegative(),
  totalFetched: z.number().int().nonnegative(),
  sample: z.array(SourcePreviewItemSchema),
});

export type SourceUpdateInput = z.infer<typeof SourceUpdateSchema>;
export type SourcePreviewRequestInput = z.infer<typeof SourcePreviewRequestSchema>;

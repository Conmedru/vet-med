import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (value === "") return null;
  return value;
};

const OptionalNullableString = z.preprocess(
  emptyToNull,
  z.string().trim().max(2000).nullable().optional()
);

const OptionalNullableUrl = z.preprocess(
  emptyToNull,
  z.string().trim().url().nullable().optional()
);

const OptionalSlug = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).max(200).optional()
);

export const JournalIssueCreateSchema = z
  .object({
    slug: OptionalSlug,
    title: z.string().trim().min(1).max(300),
    issueNumber: z.preprocess(emptyToNull, z.string().trim().max(100).nullable().optional()),
    publicationDate: z.coerce.date(),
    description: OptionalNullableString,
    coverImageUrl: z.preprocess(emptyToNull, z.string().trim().url().nullable().optional()),
    coverAlt: z.preprocess(emptyToNull, z.string().trim().max(300).nullable().optional()),
    landingUrl: OptionalNullableUrl,
    pdfUrl: OptionalNullableUrl,
    isPublished: z.boolean().optional().default(false),
    isFeatured: z.boolean().optional().default(true),
  })
  .strict();

export const JournalIssueUpdateSchema = z
  .object({
    slug: OptionalSlug,
    title: z.string().trim().min(1).max(300).optional(),
    issueNumber: z.preprocess(emptyToNull, z.string().trim().max(100).nullable().optional()),
    publicationDate: z.coerce.date().optional(),
    description: OptionalNullableString,
    coverImageUrl: z.preprocess(emptyToNull, z.string().trim().url().nullable().optional()),
    coverAlt: z.preprocess(emptyToNull, z.string().trim().max(300).nullable().optional()),
    landingUrl: OptionalNullableUrl,
    pdfUrl: OptionalNullableUrl,
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  })
  .strict();

export const JournalIssueApiItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  issueNumber: z.string().nullable(),
  publicationDate: z.string().datetime(),
  description: z.string().nullable(),
  coverImageUrl: z.string(),
  coverAlt: z.string().nullable(),
  landingUrl: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const JournalIssueListResponseSchema = z.object({
  issues: z.array(JournalIssueApiItemSchema),
});

export const JournalIssueSingleResponseSchema = z.object({
  issue: JournalIssueApiItemSchema,
});

export const JournalPublicResponseSchema = z.object({
  issues: z.array(JournalIssueApiItemSchema),
  latestIssue: JournalIssueApiItemSchema.nullable(),
});

export const JournalDeleteResponseSchema = z.object({
  success: z.literal(true),
});

export type JournalIssueCreateInput = z.infer<typeof JournalIssueCreateSchema>;
export type JournalIssueUpdateInput = z.infer<typeof JournalIssueUpdateSchema>;
export type JournalIssueApiItem = z.infer<typeof JournalIssueApiItemSchema>;

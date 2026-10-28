import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (value === "") return null;
  return value;
};

// z.string().url() also accepts javascript: and other schemes; links are rendered as href
const httpUrl = z
  .string()
  .trim()
  .url()
  .max(2000)
  .refine((url) => /^https?:\/\//i.test(url), "Only http(s) links are allowed");

export const EventCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.preprocess(emptyToNull, z.string().trim().max(4000).nullable().optional()),
    linkUrl: z.preprocess(emptyToNull, httpUrl.nullable().optional()),
    organizer: z.string().trim().min(1).max(300),
    eventDate: z.coerce.date(),
    endDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
    location: z.preprocess(emptyToNull, z.string().trim().max(500).nullable().optional()),
    isOnline: z.boolean().optional(),
  })
  .strict();

export const EventUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.preprocess(emptyToNull, z.string().trim().max(4000).nullable().optional()),
    linkUrl: z.preprocess(emptyToNull, httpUrl.nullable().optional()),
    organizer: z.string().trim().min(1).max(300).optional(),
    eventDate: z.coerce.date().optional(),
    endDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
    location: z.preprocess(emptyToNull, z.string().trim().max(500).nullable().optional()),
    isOnline: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const EventApiItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  linkUrl: z.string().nullable(),
  organizer: z.string(),
  eventDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  location: z.string().nullable(),
  isOnline: z.boolean(),
  sourceType: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const EventListResponseSchema = z.object({
  events: z.array(EventApiItemSchema),
});

export const EventSingleResponseSchema = z.object({
  event: EventApiItemSchema,
});

export const VetDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string(),
});

export const EventMonthResponseSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  events: z.array(EventApiItemSchema),
  vetDates: z.array(VetDateSchema),
});

export const EventDeleteResponseSchema = z.object({
  success: z.literal(true),
});

export type EventCreateInput = z.infer<typeof EventCreateSchema>;
export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;
export type EventApiItem = z.infer<typeof EventApiItemSchema>;

import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (value === "") return null;
  return value;
};

export const EventCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.preprocess(emptyToNull, z.string().trim().max(4000).nullable().optional()),
    organizer: z.string().trim().min(1).max(300),
    eventDate: z.coerce.date(),
  })
  .strict();

export const EventUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    description: z.preprocess(emptyToNull, z.string().trim().max(4000).nullable().optional()),
    organizer: z.string().trim().min(1).max(300).optional(),
    eventDate: z.coerce.date().optional(),
  })
  .strict();

export const EventApiItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  organizer: z.string(),
  eventDate: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const EventListResponseSchema = z.object({
  events: z.array(EventApiItemSchema),
});

export const EventSingleResponseSchema = z.object({
  event: EventApiItemSchema,
});

export const EventMonthResponseSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  events: z.array(EventApiItemSchema),
});

export const EventDeleteResponseSchema = z.object({
  success: z.literal(true),
});

export type EventCreateInput = z.infer<typeof EventCreateSchema>;
export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;
export type EventApiItem = z.infer<typeof EventApiItemSchema>;

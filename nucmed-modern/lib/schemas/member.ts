import { z } from "zod";
import { isValidSpecialtySlug, OTHER_SPECIALTY_SLUG } from "@/lib/data/specialties";

// Letters (any alphabet), spaces, hyphen, apostrophe, dot: names end up in emails and pages
const PERSON_NAME = /^\p{L}[\p{L}\s'’.-]*$/u;

// Пароль: минимум 8 символов — баланс между безопасностью и тем, что
// аудитория (практикующие врачи) не должна страдать от вычурных требований.
const PasswordSchema = z
  .string()
  .min(8, "Пароль должен содержать не менее 8 символов")
  .max(200);

export const RegisterSchema = z
  .object({
    lastName: z.string().trim().min(1, "Укажите фамилию").max(120).regex(PERSON_NAME, "Только буквы, пробел, дефис и апостроф"),
    firstName: z.string().trim().min(1, "Укажите имя").max(120).regex(PERSON_NAME, "Только буквы, пробел, дефис и апостроф"),
    middleName: z.string().trim().min(1, "Укажите отчество").max(120).regex(PERSON_NAME, "Только буквы, пробел, дефис и апостроф"),
    specialty: z.string().trim().min(1, "Укажите специальность"),
    specialtyOther: z.string().trim().max(200).optional(),
    email: z.string().trim().toLowerCase().email("Некорректный email").max(200),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    country: z.string().trim().min(1, "Укажите страну").max(120),
    city: z.string().trim().min(1, "Укажите город").max(120),
    password: PasswordSchema,
    interests: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
    consentHealthcare: z.literal(true, {
      message: "Необходимо подтвердить, что вы специалист здравоохранения",
    }),
    consentPd152: z.literal(true, {
      message: "Необходимо согласие на обработку персональных данных",
    }),
    consentPd156: z.literal(true, {
      message: "Необходимо согласие на передачу персональных данных",
    }),
    consentMarketing: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!isValidSpecialtySlug(data.specialty)) {
      ctx.addIssue({ code: "custom", path: ["specialty"], message: "Неизвестная специальность" });
    }
    if (data.specialty === OTHER_SPECIALTY_SLUG && !data.specialtyOther?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["specialtyOther"],
        message: "Уточните вашу специальность",
      });
    }
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Некорректный email"),
    password: z.string().min(1, "Введите пароль"),
  })
  .strict();

export const ForgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Некорректный email"),
  })
  .strict();

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: PasswordSchema,
  })
  .strict();

export const ProfileUpdateSchema = z
  .object({
    lastName: z.string().trim().min(1).max(120).regex(PERSON_NAME, "Только буквы, пробел, дефис и апостроф").optional(),
    firstName: z.string().trim().min(1).max(120).regex(PERSON_NAME, "Только буквы, пробел, дефис и апостроф").optional(),
    middleName: z.string().trim().min(1).max(120).regex(PERSON_NAME, "Только буквы, пробел, дефис и апостроф").optional(),
    specialty: z.string().trim().min(1).optional(),
    specialtyOther: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    country: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    interests: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    consentMarketing: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.specialty && !isValidSpecialtySlug(data.specialty)) {
      ctx.addIssue({ code: "custom", path: ["specialty"], message: "Неизвестная специальность" });
    }
  });

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: PasswordSchema,
  })
  .strict();

export const FeedSettingsSchema = z
  .object({
    // Rubric slugs from lib/rubrics.ts; unknown ones are dropped by the route
    rubrics: z.array(z.string().trim().min(1).max(50)).max(40).optional(),
    digestEnabled: z.boolean().optional(),
  })
  .strict();

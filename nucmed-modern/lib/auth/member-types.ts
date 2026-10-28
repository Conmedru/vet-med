/**
 * Публичный периметр личного кабинета специалиста (Member).
 *
 * Умышленно отделён от lib/auth/types.ts (админский User/UserRole):
 * разные cookie, разные таблицы, разные session-модели. Это исключает
 * путаницу между "кто угодно зарегистрировался на сайте" и
 * "администратор редакции с правами на публикацию".
 */

export const MEMBER_SESSION_COOKIE_NAME = "convet_member";
export const MEMBER_SESSION_DURATION_DAYS = 30;

export type MemberStatus = "ACTIVE" | "BLOCKED" | "DELETED";

export interface AuthMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  specialty: string;
  specialtyOther: string | null;
  emailVerified: boolean;
  rubrics?: string[];
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  interests?: string[];
  digestEnabled?: boolean;
  consentMarketing?: boolean;
  createdAt?: Date;
}

export class MemberAuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = "MemberAuthError";
  }
}

/** Same-site path to return to after login/registration; anything else falls back (no open redirect) */
export function safeRedirectPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

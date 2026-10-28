import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  AuthMember,
  MEMBER_SESSION_COOKIE_NAME,
  MEMBER_SESSION_DURATION_DAYS,
  MemberAuthError,
} from "./member-types";

export { MemberAuthError } from "./member-types";

export function generateMemberToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Создать сессию специалиста и вернуть сырой токен (для cookie).
 * В БД хранится только его sha256-хеш.
 */
export async function createMemberSession(
  memberId: string,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateMemberToken();
  const expiresAt = new Date(Date.now() + MEMBER_SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.memberSession.create({
    data: {
      memberId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    },
  });

  await prisma.member.update({
    where: { id: memberId },
    data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
  });

  return { token, expiresAt };
}

export async function setMemberSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearMemberSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_SESSION_COOKIE_NAME);
}

/**
 * Текущий специалист по cookie сессии, либо null. Не бросает исключений —
 * безопасно вызывать в любом server component/route.
 */
export async function getCurrentMember(): Promise<AuthMember | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.memberSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      member: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          middleName: true,
          specialty: true,
          specialtyOther: true,
          emailVerified: true,
          status: true,
          rubrics: true,
          phone: true,
          country: true,
          city: true,
          interests: true,
          digestEnabled: true,
          consentMarketing: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || session.member.status !== "ACTIVE") {
    return null;
  }

  // fire-and-forget — не блокируем ответ
  prisma.memberSession
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  const { status, ...member } = session.member;
  return member;
}

export async function requireMember(): Promise<AuthMember> {
  const member = await getCurrentMember();
  if (!member) {
    throw new MemberAuthError("Unauthorized", 401);
  }
  return member;
}

export async function invalidateMemberSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.memberSession.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
  }
  await clearMemberSessionCookie();
}

/** Sign out everywhere except the current session (after a password change) */
export async function invalidateOtherMemberSessions(memberId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE_NAME)?.value;
  await prisma.memberSession.deleteMany({
    where: { memberId, ...(token ? { tokenHash: { not: hashToken(token) } } : {}) },
  });
}

// ─── Known device ────────────────────────────────────────────────
// After a successful login the browser gets a signed cookie for that email. A device that has
// logged in before is not blocked by the account-wide failure limit, so a stranger hammering
// the account from many IPs cannot lock the vet out of their own browser.

const KNOWN_DEVICE_COOKIE = "convet_device";
const KNOWN_DEVICE_DAYS = 365;

function deviceSecret(): string | null {
  return process.env.MEMBER_DEVICE_SECRET || process.env.CRON_SECRET || null;
}

function deviceSignature(email: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`known-device:${email.toLowerCase()}`).digest("hex");
}

export async function setKnownDeviceCookie(email: string): Promise<void> {
  const secret = deviceSecret();
  if (!secret) return;
  const cookieStore = await cookies();
  cookieStore.set(KNOWN_DEVICE_COOKIE, deviceSignature(email, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: KNOWN_DEVICE_DAYS * 24 * 60 * 60,
  });
}

export async function isKnownDevice(email: string): Promise<boolean> {
  const secret = deviceSecret();
  if (!secret) return false;
  const cookieStore = await cookies();
  const value = cookieStore.get(KNOWN_DEVICE_COOKIE)?.value;
  if (!value) return false;
  const expected = Buffer.from(deviceSignature(email, secret));
  const actual = Buffer.from(value);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

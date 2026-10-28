import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/utils";
import { createMemberSession, setMemberSessionCookie } from "@/lib/auth/member-session";
import { LoginSchema } from "@/lib/schemas/member";
import { checkRateLimit, getClientIp, isRateLimited, recordFailure, resetRateLimit } from "@/lib/auth/rate-limit";
import { getSpecialtyName } from "@/lib/data/specialties";

const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAILS_PER_IP = 10;
const LOGIN_FAILS_PER_ACCOUNT = 100;

// bcrypt hash of a random string (cost 12), compared against when the account does not exist
const DUMMY_PASSWORD_HASH = "$2b$12$1kzxu6WSfQer0GgOxJVABedlyHUjoRhTX7jg31s5cWTInKUJR0aJe";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const { allowed, retryAfterMs } = checkRateLimit(`login:${ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const result = LoginSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Введите email и пароль" }, { status: 400 });
  }

  const { email, password } = result.data;

  // Failed-password limits. Only failures count and a successful login resets them, so a stranger
  // cannot lock a vet out: the strict limit is per account + IP, the per-account one is high and
  // only stops distributed guessing.
  const pairKey = `login-fail:${email}:${ip}`;
  const accountKey = `login-fail:${email}`;
  const pair = isRateLimited(pairKey, LOGIN_FAILS_PER_IP);
  const account = isRateLimited(accountKey, LOGIN_FAILS_PER_ACCOUNT);
  if (pair.limited || account.limited) {
    return NextResponse.json(
      { error: "Слишком много неудачных попыток входа. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(Math.max(pair.retryAfterMs, account.retryAfterMs) / 1000)) } }
    );
  }
  const recordLoginFailure = () => {
    recordFailure(pairKey, LOGIN_FAIL_WINDOW_MS);
    recordFailure(accountKey, LOGIN_FAIL_WINDOW_MS);
  };

  const member = await prisma.member.findUnique({ where: { email } });
  if (!member || member.status !== "ACTIVE") {
    // Same bcrypt work as for a real account, so response time does not reveal registered emails
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    recordLoginFailure();
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  const valid = await verifyPassword(password, member.passwordHash);
  if (!valid) {
    recordLoginFailure();
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }
  resetRateLimit(pairKey);

  const userAgent = request.headers.get("user-agent") || undefined;
  const session = await createMemberSession(member.id, { userAgent, ipAddress: ip });
  await setMemberSessionCookie(session.token, session.expiresAt);

  return NextResponse.json({
    success: true,
    member: {
      id: member.id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      middleName: member.middleName,
      specialty: member.specialty,
      specialtyName: getSpecialtyName(member.specialty) ?? member.specialty,
      emailVerified: member.emailVerified,
    },
  });
}

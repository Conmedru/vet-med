import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/utils";
import { createMemberSession, setMemberSessionCookie } from "@/lib/auth/member-session";
import { LoginSchema } from "@/lib/schemas/member";
import { checkRateLimit, getClientIp, loginFailureKey, releaseAttempt, reserveAttempt, resetRateLimit } from "@/lib/auth/rate-limit";
import { getSpecialtyName } from "@/lib/data/specialties";

const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAILS_PER_IP = 10;
const LOGIN_FAILS_PER_ACCOUNT = 20;

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

  // Failed-password limits: every attempt is reserved before the (slow) bcrypt check and given
  // back on success, so only failures stay counted and parallel requests cannot slip past the limit.
  // Strict per account + IP; per account 20 per 15 min against guessing from many IPs.
  // If someone deliberately locks a vet out, a password reset by email clears the counters.
  const pairKey = loginFailureKey(email, ip);
  const accountKey = loginFailureKey(email);
  const pair = reserveAttempt(pairKey, LOGIN_FAILS_PER_IP, LOGIN_FAIL_WINDOW_MS);
  const account = pair.allowed ? reserveAttempt(accountKey, LOGIN_FAILS_PER_ACCOUNT, LOGIN_FAIL_WINDOW_MS) : pair;
  if (!pair.allowed || !account.allowed) {
    if (pair.allowed) releaseAttempt(pairKey);
    return NextResponse.json(
      { error: "Слишком много неудачных попыток входа. Попробуйте позже или восстановите пароль." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(Math.max(pair.retryAfterMs, account.retryAfterMs) / 1000)) } }
    );
  }

  const member = await prisma.member.findUnique({ where: { email } });
  if (!member || member.status !== "ACTIVE") {
    // Same bcrypt work as for a real account, so response time does not reveal registered emails
    await verifyPassword(password, DUMMY_PASSWORD_HASH);
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }

  const valid = await verifyPassword(password, member.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }
  // Success: this attempt was not a failure
  resetRateLimit(pairKey);
  releaseAttempt(accountKey);

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

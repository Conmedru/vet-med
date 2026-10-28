import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPasswordAsync } from "@/lib/auth/utils";
import { createMemberSession, rememberDevice, setMemberSessionCookie, generateMemberToken, hashToken } from "@/lib/auth/member-session";
import { sendMemberVerificationEmail } from "@/lib/auth/member-email";
import { RegisterSchema } from "@/lib/schemas/member";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { getSpecialtyName } from "@/lib/data/specialties";
import { getRubric } from "@/lib/rubrics";

/**
 * POST /api/member/register
 * Публичная регистрация специалиста в личном кабинете.
 *
 * Важно: пишет в модель Member, а не в User (админский периметр) —
 * поэтому здесь физически невозможно создать администратора через
 * подмену полей запроса.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const { allowed, retryAfterMs } = checkRateLimit(`register:${ip}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток регистрации. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const result = RegisterSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Проверьте заполненные поля", details: result.error.format() },
      { status: 400 }
    );
  }

  const data = result.data;

  const existing = await prisma.member.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json(
      { error: "Специалист с таким email уже зарегистрирован" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPasswordAsync(data.password);
  const specialtyName = getSpecialtyName(data.specialty);

  const member = await prisma.member.create({
    data: {
      email: data.email,
      passwordHash,
      lastName: data.lastName,
      firstName: data.firstName,
      middleName: data.middleName,
      specialty: data.specialty,
      specialtyOther: data.specialty === "other" ? data.specialtyOther?.trim() || null : null,
      phone: data.phone || null,
      country: data.country,
      city: data.city,
      interests: data.interests,
      // Feed starts from the vet's specialty; adjustable in the account
      rubrics: getRubric(data.specialty) ? [data.specialty] : [],
      // No digest without consent to mailings (38-ФЗ / 152-ФЗ)
      digestEnabled: data.consentMarketing,
      consentHealthcare: data.consentHealthcare,
      consentPd152: data.consentPd152,
      consentPd156: data.consentPd156,
      consentMarketing: data.consentMarketing,
      consentedAt: new Date(),
    },
  });

  // Unisender list for the digest — only with consent to mailings
  if (data.consentMarketing) {
    try {
      const { unisender, DEFAULT_LIST_ID } = await import("@/lib/unisender");
      await unisender.subscribe(data.email, DEFAULT_LIST_ID, { SUBSCRIPTION_TYPE: "digest" });
    } catch (e) {
      console.error("[member/register] Unisender sync failed:", e);
    }
  }

  // Мягкая верификация: письмо уходит в фоне, доступ открыт сразу.
  try {
    const verifyToken = generateMemberToken();
    await prisma.memberToken.create({
      data: {
        memberId: member.id,
        tokenHash: hashToken(verifyToken),
        type: "EMAIL_VERIFICATION",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    const fullName = `${data.firstName} ${data.lastName}`;
    await sendMemberVerificationEmail(data.email, fullName, verifyToken);
  } catch (e) {
    console.error("[member/register] Verification email failed:", e);
  }

  const userAgent = request.headers.get("user-agent") || undefined;
  const session = await createMemberSession(member.id, { userAgent, ipAddress: ip });
  await setMemberSessionCookie(session.token, session.expiresAt);
  await rememberDevice(member.id);

  return NextResponse.json({
    success: true,
    member: {
      id: member.id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      middleName: member.middleName,
      specialty: member.specialty,
      specialtyName: specialtyName ?? member.specialty,
      emailVerified: member.emailVerified,
    },
  });
}

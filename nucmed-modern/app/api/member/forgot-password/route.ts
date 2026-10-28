import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMemberToken, hashToken } from "@/lib/auth/member-session";
import { sendMemberPasswordResetEmail } from "@/lib/auth/member-email";
import { ForgotPasswordSchema } from "@/lib/schemas/member";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const { allowed, retryAfterMs } = checkRateLimit(`forgot-password:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const result = ForgotPasswordSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Укажите корректный email" }, { status: 400 });
  }

  const { email } = result.data;

  // Per-account limit against a flood of reset emails from many IPs. Over the limit the answer
  // is the usual one and no email is sent: the requester cannot tell, the owner's earlier link still works.
  const sendAllowed = checkRateLimit(`forgot-password-account:${email}`, { limit: 3, windowMs: 60 * 60 * 1000 }).allowed;

  // Ответ одинаков независимо от того, найден ли аккаунт — иначе форма
  // становится инструментом для проверки, зарегистрирован ли конкретный врач.
  const genericResponse = NextResponse.json({
    success: true,
    message: "Если такой email зарегистрирован, на него отправлена ссылка для восстановления пароля.",
  });

  const member = await prisma.member.findUnique({ where: { email } });
  if (!member || member.status !== "ACTIVE" || !sendAllowed) {
    return genericResponse;
  }

  const token = generateMemberToken();
  await prisma.memberToken.create({
    data: {
      memberId: member.id,
      tokenHash: hashToken(token),
      type: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendMemberPasswordResetEmail(email, `${member.firstName} ${member.lastName}`, token).catch(
    (e) => console.error("[member/forgot-password] Email failed:", e)
  );

  return genericResponse;
}

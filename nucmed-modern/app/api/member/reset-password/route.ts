import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPasswordAsync } from "@/lib/auth/utils";
import { hashToken } from "@/lib/auth/member-session";
import { ResetPasswordSchema } from "@/lib/schemas/member";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const result = ResetPasswordSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Проверьте заполненные поля", details: result.error.format() },
      { status: 400 }
    );
  }

  const { token, password } = result.data;

  const record = await prisma.memberToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Ссылка недействительна или устарела" }, { status: 400 });
  }

  // Claim the one-time token atomically: concurrent requests cannot both use it
  const claimed = await prisma.memberToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) {
    return NextResponse.json({ error: "Ссылка недействительна или устарела" }, { status: 400 });
  }

  const passwordHash = await hashPasswordAsync(password);

  await prisma.$transaction([
    prisma.member.update({ where: { id: record.memberId }, data: { passwordHash } }),
    // Восстановление пароля обесценивает все текущие сессии — стандартная защита
    // на случай, если пароль восстанавливали из-за компрометации аккаунта.
    prisma.memberSession.deleteMany({ where: { memberId: record.memberId } }),
  ]);

  return NextResponse.json({ success: true });
}

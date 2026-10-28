import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPasswordAsync, verifyPassword } from "@/lib/auth/utils";
import { invalidateOtherMemberSessions, MemberAuthError, requireMember } from "@/lib/auth/member-session";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { ChangePasswordSchema } from "@/lib/schemas/member";

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();

    // Limit guessing of the current password from a hijacked session
    const { allowed } = checkRateLimit(`change-password:${member.id}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }

    const result = ChangePasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Проверьте заполненные поля" }, { status: 400 });
    }

    const full = await prisma.member.findUnique({ where: { id: member.id } });
    if (!full) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const valid = await verifyPassword(result.data.currentPassword, full.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Текущий пароль указан неверно" }, { status: 400 });
    }

    await prisma.member.update({
      where: { id: member.id },
      data: { passwordHash: await hashPasswordAsync(result.data.newPassword) },
    });
    await invalidateOtherMemberSessions(member.id);

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MemberAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

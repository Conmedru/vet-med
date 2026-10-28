import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/member-session";

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Токен не указан" }, { status: 400 });
  }

  const record = await prisma.memberToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (
    !record ||
    record.type !== "EMAIL_VERIFICATION" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return NextResponse.json({ error: "Ссылка недействительна или устарела" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.member.update({
      where: { id: record.memberId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    }),
    prisma.memberToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}

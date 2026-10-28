import { NextResponse } from "next/server";
import { getCurrentMember, invalidateMemberSession } from "@/lib/auth/member-session";
import { getSpecialtyName } from "@/lib/data/specialties";

// Per-user response: never cached
export const dynamic = "force-dynamic";

/**
 * GET /api/member/session — текущий специалист (для клиентского хедера/меню).
 * DELETE /api/member/session — выход.
 */
export async function GET() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    member: {
      ...member,
      specialtyName:
        member.specialty === "other" && member.specialtyOther
          ? member.specialtyOther
          : getSpecialtyName(member.specialty) ?? member.specialty,
    },
  });
}

export async function DELETE() {
  await invalidateMemberSession();
  return NextResponse.json({ success: true });
}

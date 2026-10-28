import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMemberToken, hashToken, MemberAuthError, requireMember } from "@/lib/auth/member-session";
import { sendMemberVerificationEmail } from "@/lib/auth/member-email";
import { checkRateLimit } from "@/lib/auth/rate-limit";

/** POST /api/member/resend-verification — new email confirmation link for the signed-in vet */
export async function POST() {
  try {
    const member = await requireMember();
    if (member.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const { allowed } = checkRateLimit(`resend-verification:${member.id}`, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: "Письмо уже отправлено. Попробуйте через час." }, { status: 429 });
    }

    const token = generateMemberToken();
    await prisma.$transaction([
      // Only the latest link works
      prisma.memberToken.deleteMany({ where: { memberId: member.id, type: "EMAIL_VERIFICATION", usedAt: null } }),
      prisma.memberToken.create({
        data: {
          memberId: member.id,
          tokenHash: hashToken(token),
          type: "EMAIL_VERIFICATION",
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      }),
    ]);
    await sendMemberVerificationEmail(member.email, `${member.firstName} ${member.lastName}`, token);

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof MemberAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

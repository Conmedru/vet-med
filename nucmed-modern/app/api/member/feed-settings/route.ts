import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MemberAuthError, requireMember } from "@/lib/auth/member-session";
import { FeedSettingsSchema } from "@/lib/schemas/member";
import { filterRubricSlugs } from "@/lib/rubrics";

/** PATCH /api/member/feed-settings — feed rubrics and weekly digest */
export async function PATCH(request: NextRequest) {
  try {
    const member = await requireMember();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }

    const result = FeedSettingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Проверьте заполненные поля" }, { status: 400 });
    }

    const { rubrics, digestEnabled } = result.data;
    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        ...(rubrics !== undefined ? { rubrics: filterRubricSlugs(rubrics) } : {}),
        ...(digestEnabled !== undefined ? { digestEnabled } : {}),
        // Turning the digest on in the account is an explicit consent to the mailing
        ...(digestEnabled ? { consentMarketing: true } : {}),
      },
      select: { rubrics: true, digestEnabled: true },
    });

    // The digest is a Unisender campaign to the list: keep the list in sync with the account
    if (digestEnabled !== undefined) {
      try {
        const { unisender, DEFAULT_LIST_ID } = await import("@/lib/unisender");
        if (digestEnabled) {
          await unisender.subscribe(member.email, DEFAULT_LIST_ID, { SUBSCRIPTION_TYPE: "digest" });
        } else {
          await unisender.exclude(member.email, DEFAULT_LIST_ID);
        }
      } catch (e) {
        console.error("[member/feed-settings] Unisender sync failed:", e);
      }
    }

    return NextResponse.json({ success: true, ...updated });
  } catch (e) {
    if (e instanceof MemberAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

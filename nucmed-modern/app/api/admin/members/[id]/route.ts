import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, validateAuthWithDevBypass, validateAdminAuth } from "@/lib/auth";
import { getSpecialtyName } from "@/lib/data/specialties";
import { articleRubrics } from "@/lib/rubrics";

export const dynamic = "force-dynamic";

async function requireAuth(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return null;
}

/**
 * GET /api/admin/members/[id]
 * Полная карточка специалиста: анкета, согласия, подписки на рубрики,
 * активные сессии (для понимания, откуда и когда заходит).
 * passwordHash и tokenHash не возвращаются никогда.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        lastName: true,
        firstName: true,
        middleName: true,
        specialty: true,
        specialtyOther: true,
        phone: true,
        country: true,
        city: true,
        interests: true,
        rubrics: true,
        digestEnabled: true,
        consentHealthcare: true,
        consentPd152: true,
        consentPd156: true,
        consentMarketing: true,
        consentedAt: true,
        emailVerified: true,
        emailVerifiedAt: true,
        status: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          orderBy: { lastUsedAt: "desc" },
          take: 20,
          select: {
            id: true,
            userAgent: true,
            ipAddress: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Специалист не найден" }, { status: 404 });
    }

    const now = new Date();

    return NextResponse.json({
      member: {
        ...member,
        specialtyName:
          member.specialty === "other"
            ? member.specialtyOther || "Другая специальность"
            : getSpecialtyName(member.specialty) ?? member.specialty,
        // Feed rubrics shaped like the onco-compass subscriptions the drawer expects
        subscriptions: articleRubrics(member.rubrics).map((r) => ({
          id: r.slug,
          createdAt: member.updatedAt,
          rubric: { id: r.slug, name: r.name, slug: r.slug, kind: r.kind },
        })),
        sessions: member.sessions.map((s) => ({ ...s, isActive: s.expiresAt > now })),
      },
    });
  } catch (error) {
    console.error("[Admin Members] detail error:", error);
    return NextResponse.json({ error: "Не удалось загрузить карточку" }, { status: 500 });
  }
}

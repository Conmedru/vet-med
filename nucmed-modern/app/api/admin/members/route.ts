import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser, validateAuthWithDevBypass, validateAdminAuth } from "@/lib/auth";
import { getSpecialtyName } from "@/lib/data/specialties";

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

const SORTABLE = new Set(["createdAt", "lastLoginAt", "lastName", "loginCount"]);

/**
 * GET /api/admin/members
 * Список зарегистрированных специалистов для админки.
 *
 * Поиск идёт по ФИО / email / городу / стране / произвольной специальности
 * и по интересам — то есть по всем текстовым полям, которые врач вводил сам.
 * Пагинация серверная: база растёт, а таблица в админке не должна тянуть
 * весь список целиком.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const status = searchParams.get("status") ?? "";
    const verified = searchParams.get("verified") ?? "";
    const specialty = searchParams.get("specialty") ?? "";
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const perPage = Math.min(Math.max(Number(searchParams.get("perPage")) || 25, 5), 100);

    const sortByParam = searchParams.get("sortBy") ?? "createdAt";
    const sortBy = SORTABLE.has(sortByParam) ? sortByParam : "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Prisma.MemberWhereInput = {};

    if (q) {
      const insensitive = Prisma.QueryMode.insensitive;
      where.OR = [
        { email: { contains: q, mode: insensitive } },
        { lastName: { contains: q, mode: insensitive } },
        { firstName: { contains: q, mode: insensitive } },
        { middleName: { contains: q, mode: insensitive } },
        { city: { contains: q, mode: insensitive } },
        { country: { contains: q, mode: insensitive } },
        { phone: { contains: q, mode: insensitive } },
        { specialtyOther: { contains: q, mode: insensitive } },
        { interests: { has: q } },
      ];
    }

    if (status === "ACTIVE" || status === "BLOCKED" || status === "DELETED") {
      where.status = status;
    }
    if (verified === "yes") where.emailVerified = true;
    if (verified === "no") where.emailVerified = false;
    if (specialty) where.specialty = specialty;

    const [total, rows, stats] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        orderBy: [{ [sortBy]: sortDir }],
        skip: (page - 1) * perPage,
        take: perPage,
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
          emailVerified: true,
          status: true,
          digestEnabled: true,
          consentMarketing: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          rubrics: true,
          _count: { select: { sessions: true } },
        },
      }),
      buildStats(),
    ]);

    return NextResponse.json({
      members: rows.map((m) => ({
        ...m,
        specialtyName:
          m.specialty === "other"
            ? m.specialtyOther || "Другая специальность"
            : getSpecialtyName(m.specialty) ?? m.specialty,
        subscriptionsCount: m.rubrics.length,
        sessionsCount: m._count.sessions,
        _count: undefined,
      })),
      pagination: { page, perPage, total, pages: Math.max(Math.ceil(total / perPage), 1) },
      stats,
    });
  } catch (error) {
    console.error("[Admin Members] list error:", error);
    return NextResponse.json({ error: "Не удалось загрузить список" }, { status: 500 });
  }
}

/**
 * Сводка по базе целиком (не по текущей странице фильтра) — иначе KPI
 * менялись бы при каждом поиске и перестали быть точкой опоры.
 */
async function buildStats() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, verified, active, digest, newDay, newWeek, topSpecialties, topCities] =
    await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { emailVerified: true } }),
      prisma.member.count({ where: { status: "ACTIVE" } }),
      prisma.member.count({ where: { digestEnabled: true } }),
      prisma.member.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.member.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.member.groupBy({
        by: ["specialty"],
        _count: { specialty: true },
        orderBy: { _count: { specialty: "desc" } },
        take: 6,
      }),
      prisma.member.groupBy({
        by: ["city"],
        _count: { city: true },
        orderBy: { _count: { city: "desc" } },
        take: 6,
      }),
    ]);

  return {
    total,
    verified,
    active,
    digest,
    newDay,
    newWeek,
    topSpecialties: topSpecialties.map((s) => ({
      slug: s.specialty,
      name: getSpecialtyName(s.specialty) ?? s.specialty,
      count: s._count.specialty,
    })),
    topCities: topCities.map((c) => ({ city: c.city, count: c._count.city })),
  };
}

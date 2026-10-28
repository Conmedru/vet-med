import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MemberAuthError, requireMember } from "@/lib/auth/member-session";
import { ProfileUpdateSchema } from "@/lib/schemas/member";
import { getSpecialtyName } from "@/lib/data/specialties";

export async function GET() {
  try {
    const member = await requireMember();

    return NextResponse.json({
      member: {
        id: member.id,
        email: member.email,
        lastName: member.lastName,
        firstName: member.firstName,
        middleName: member.middleName,
        specialty: member.specialty,
        specialtyOther: member.specialtyOther,
        specialtyName: getSpecialtyName(member.specialty) ?? member.specialty,
        phone: member.phone ?? null,
        country: member.country ?? null,
        city: member.city ?? null,
        interests: member.interests ?? [],
        rubrics: member.rubrics ?? [],
        digestEnabled: member.digestEnabled ?? false,
        consentMarketing: member.consentMarketing ?? false,
        emailVerified: member.emailVerified,
        createdAt: member.createdAt,
      },
    });
  } catch (e) {
    if (e instanceof MemberAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const member = await requireMember();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }

    const result = ProfileUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Проверьте заполненные поля", details: result.error.format() },
        { status: 400 }
      );
    }

    const data = result.data;
    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        ...data,
        specialtyOther:
          data.specialty && data.specialty !== "other"
            ? null
            : data.specialtyOther?.trim() || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: updated.id,
        email: updated.email,
        lastName: updated.lastName,
        firstName: updated.firstName,
        middleName: updated.middleName,
        specialty: updated.specialty,
        specialtyName: getSpecialtyName(updated.specialty) ?? updated.specialty,
        phone: updated.phone,
        country: updated.country,
        city: updated.city,
        interests: updated.interests,
      },
    });
  } catch (e) {
    if (e instanceof MemberAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/utils";

/**
 * POST /api/setup/create-admin
 * One-time admin creation endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email = "admin@vetmed.ru", password = "vetmed2026!", secret } = body;
    
    // Simple protection - require CRON_SECRET or ADMIN_API_KEY
    const expectedSecret = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const passwordHash = hashPassword(password);
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerified: true,
        updatedAt: new Date(),
      },
      create: {
        email,
        passwordHash,
        name: "Administrator",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
    
  } catch (error: any) {
    console.error("[CreateAdmin] Error:", error);
    return NextResponse.json(
      { error: "Failed to create admin", detail: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

/**
 * POST /api/admin/auth
 * Production-ready authentication with sessions
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log("[Auth] Login attempt:", { email, hasPassword: !!password });
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("[Auth] User not found:", email);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("[Auth] User found:", { id: user.id, email: user.email, hasPasswordHash: !!user.passwordHash });

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    console.log("[Auth] Password verification:", { valid: passwordValid, hashFormat: user.passwordHash?.startsWith("$2") ? "bcrypt" : "pbkdf2" });
    
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "127.0.0.1";

    const session = await createSession(user.id, { userAgent, ipAddress });

    // Set session cookie
    await setSessionCookie(session.token, session.expiresAt);

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "user.login",
        entityType: "user",
        entityId: user.id,
        userId: user.id,
        actorType: "user",
        ipAddress,
        userAgent,
        success: true,
      },
    }).catch(() => {}); // Ignore logging errors

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: "Authenticated successfully",
    });

  } catch (error: any) {
    console.error("[Auth] Login error:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: "Authentication failed", detail: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth
 * Check current session
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nucmed_session")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Session check failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/auth
 * Logout - clear session
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nucmed_session")?.value;

    if (token) {
      // Invalidate session in DB
      await prisma.session.delete({
        where: { token },
      }).catch(() => {}); // Ignore if already deleted

      // Clear cookie
      cookieStore.delete("nucmed_session");
    }

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error("[Auth] Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}

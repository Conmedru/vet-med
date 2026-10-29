import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";
import { getClientIp, loginFailureKey, releaseAttempt, reserveAttempt, resetRateLimit } from "@/lib/auth/rate-limit";

/**
 * POST /api/admin/auth
 * Production-ready authentication with sessions
 */
// Failed admin logins: per account+IP and per account (a stolen-password spray from many IPs)
const ADMIN_FAIL_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_FAILS_PER_IP = 5;
const ADMIN_FAILS_PER_ACCOUNT = 15;
// bcrypt of a random string: unknown emails cost the same time as wrong passwords
const DUMMY_PASSWORD_HASH = "$2b$12$1kzxu6WSfQer0GgOxJVABedlyHUjoRhTX7jg31s5cWTInKUJR0aJe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const ip = getClientIp(request.headers);
    const pairKey = `admin-${loginFailureKey(email, ip)}`;
    const accountKey = `admin-${loginFailureKey(email)}`;
    const pair = reserveAttempt(pairKey, ADMIN_FAILS_PER_IP, ADMIN_FAIL_WINDOW_MS);
    const account = pair.allowed ? reserveAttempt(accountKey, ADMIN_FAILS_PER_ACCOUNT, ADMIN_FAIL_WINDOW_MS) : pair;
    if (!pair.allowed || !account.allowed) {
      if (pair.allowed) releaseAttempt(pairKey);
      return NextResponse.json(
        { error: "Too many attempts, try again later" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(Math.max(pair.retryAfterMs, account.retryAfterMs) / 1000)) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordValid = user
      ? await verifyPassword(password, user.passwordHash)
      : (await verifyPassword(password, DUMMY_PASSWORD_HASH), false);

    if (!user || !passwordValid || user.status !== "ACTIVE") {
      console.warn("[Auth] Admin login failed", { ip });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Success: the attempts were not failures
    resetRateLimit(pairKey);
    releaseAttempt(accountKey);

    // Create session
    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = ip;

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


import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { 
  AuthUser, 
  SessionData, 
  SESSION_COOKIE_NAME, 
  PERMISSIONS, 
  UserRole,
  AuthError 
} from "./types";

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    select: {
      userId: true,
      token: true,
      expiresAt: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  // Update last used (fire and forget to avoid blocking)
  // Note: This might fail in Edge runtime if using standard Prisma Client, 
  // but we'll try to keep the structure valid.
  try {
    // We don't await this to speed up response, but in serverless/edge this might be killed.
    // For critical path, we might want to await or skip in middleware.
    prisma.session.update({
      where: { token },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});
  } catch (e) {
    // Ignore
  }

  return session;
}

/**
 * Get authenticated user from session
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      permissions: true,
    },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    permissions: user.permissions,
  };
}

/**
 * Check if user has permission
 */
export function hasPermission(user: AuthUser, permission: keyof typeof PERMISSIONS): boolean {
  // Check explicit permissions first
  if (user.permissions.includes(permission)) return true;
  if (user.permissions.includes("*")) return true; // Wildcard
  
  // Check role-based permissions
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly UserRole[]).includes(user.role);
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

/**
 * Require specific permission
 */
export async function requirePermission(permission: keyof typeof PERMISSIONS): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasPermission(user, permission)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

/**
 * Require specific role
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

/**
 * Invalidate session (logout)
 */
export async function invalidateSession(token: string): Promise<void> {
  await prisma.session.delete({
    where: { token },
  }).catch(() => {}); // Ignore if already deleted
}

/**
 * Invalidate all sessions for user
 */
export async function invalidateAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

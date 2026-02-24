
import { prisma } from "@/lib/prisma";
import { generateSessionToken } from "./utils";
import { SessionData, SESSION_DURATION_DAYS } from "./types";

/**
 * Detect device type from user agent
 */
export function detectDeviceType(userAgent?: string): string {
  if (!userAgent) return "unknown";
  if (/mobile/i.test(userAgent)) return "mobile";
  if (/tablet/i.test(userAgent)) return "tablet";
  return "desktop";
}

/**
 * Create session for user
 */
export async function createSession(
  userId: string,
  metadata?: { userAgent?: string; ipAddress?: string }
): Promise<SessionData> {
  const token = generateSessionToken();
  const refreshToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      token,
      refreshToken,
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      deviceType: detectDeviceType(metadata?.userAgent),
    },
  });

  // Update user login stats
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      loginCount: { increment: 1 },
    },
  });

  return { userId, token, expiresAt };
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

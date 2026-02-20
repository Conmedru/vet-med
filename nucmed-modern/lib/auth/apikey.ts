
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { AuthUser, UserRole } from "./types";

/**
 * Validate API key and return associated user
 */
export async function validateApiKey(key: string): Promise<AuthUser | null> {
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          permissions: true,
        },
      },
    },
  });

  if (!apiKey || !apiKey.isActive) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  if (apiKey.user.status !== "ACTIVE") return null;

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: apiKey.user.id,
    email: apiKey.user.email,
    name: apiKey.user.name,
    role: apiKey.user.role as UserRole,
    permissions: [...apiKey.user.permissions, ...apiKey.permissions],
  };
}


import crypto from "crypto";
import { compare, hashSync } from "bcryptjs";

/**
 * Hash password using bcrypt (consistent with user creation in /api/admin/users)
 */
export function hashPassword(password: string): string {
  return hashSync(password, 12);
}

/**
 * Verify password against hash
 * Supports both bcrypt ($2a$...) and legacy pbkdf2 (salt:hash) formats
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) {
    console.error("[verifyPassword] Empty hash");
    return false;
  }
  
  // Bcrypt hash format: $2a$12$... or $2b$12$...
  if (storedHash.startsWith("$2")) {
    return compare(password, storedHash);
  }
  
  // Legacy pbkdf2 format: salt:hash
  if (storedHash.includes(":")) {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
    return hash === verifyHash;
  }
  
  console.error("[verifyPassword] Unknown hash format");
  return false;
}

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

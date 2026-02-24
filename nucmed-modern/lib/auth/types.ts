
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "MODERATOR" | "VIEWER";

export const SESSION_COOKIE_NAME = "nucmed_session";
export const SESSION_DURATION_DAYS = 7;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  permissions: string[];
}

export interface SessionData {
  userId: string;
  token: string;
  expiresAt: Date;
}

// Permission definitions
export const PERMISSIONS = {
  // Articles
  "articles:read": ["VIEWER", "MODERATOR", "EDITOR", "ADMIN", "SUPER_ADMIN"],
  "articles:create": ["EDITOR", "ADMIN", "SUPER_ADMIN"],
  "articles:edit": ["EDITOR", "ADMIN", "SUPER_ADMIN"],
  "articles:delete": ["ADMIN", "SUPER_ADMIN"],
  "articles:publish": ["EDITOR", "ADMIN", "SUPER_ADMIN"],
  
  // Sources
  "sources:read": ["MODERATOR", "EDITOR", "ADMIN", "SUPER_ADMIN"],
  "sources:manage": ["ADMIN", "SUPER_ADMIN"],
  
  // Users
  "users:read": ["ADMIN", "SUPER_ADMIN"],
  "users:manage": ["SUPER_ADMIN"],
  
  // System
  "system:config": ["SUPER_ADMIN"],
  "system:logs": ["ADMIN", "SUPER_ADMIN"],
} as const;

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Authentication Middleware
 * First gate for the admin area: no admin session cookie (or API key) → login / 401.
 *
 * Note: Middleware runs in Edge Runtime by default and cannot query the database,
 * so it only checks that credentials are present; route handlers and pages validate them
 * (getAuthUser / validateAdminAuth).
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";

// Admin pages and API
const PROTECTED_PREFIXES = ["/admin", "/api/admin"];

// Admin login page and its API
const PUBLIC_EXCEPTIONS = ["/admin/auth", "/api/admin/auth"];

/** Exact path or a sub-path: "/admin" matches "/admin" and "/admin/x", not "/administrator" */
function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isLocalRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix))) {
    return NextResponse.next();
  }
  if (PUBLIC_EXCEPTIONS.some((prefix) => matches(pathname, prefix))) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (hasSession) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    // Scripts and cron call the admin API with a key; the route validates it
    const hasApiKey = Boolean(request.headers.get("x-api-key") || request.headers.get("authorization"));
    // Same localhost bypass as validateAuthWithDevBypass in the routes
    const devLocal = process.env.NODE_ENV === "development" && isLocalRequest(request);
    if (hasApiKey || devLocal) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/auth", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Only the admin area: public pages and APIs do not go through the middleware at all
  matcher: ["/admin", "/admin/:path*", "/api/admin", "/api/admin/:path*"],
};

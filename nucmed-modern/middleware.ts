/**
 * Authentication Middleware
 * Protects admin routes and API endpoints
 * 
 * Note: Middleware runs in Edge Runtime by default.
 * We disable Prisma calls in middleware to avoid edge runtime issues.
 */

import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/admin",
  "/api/admin",
];

// Public routes that don't require auth
const PUBLIC_ROUTES = [
  "/admin/auth",
  "/api/admin/auth",
  "/api/cron",
  "/api/ingest",
  "/api/sources",
  "/api/articles",
  "/api/search",
  "/api/newsletter",
  "/news",
  "/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if route needs protection
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    // Simple cookie check - actual auth validation happens in API routes/pages
    const sessionToken = request.cookies.get("nucmed_session")?.value;
    
    if (!sessionToken) {
      // Redirect to login for admin routes
      if (pathname.startsWith("/admin")) {
        const loginUrl = new URL("/admin/auth", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      // Return 401 for API routes
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

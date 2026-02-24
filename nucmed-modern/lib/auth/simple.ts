
import { NextRequest } from "next/server";

/**
 * Simple API Key authentication
 * For admin endpoints - requires ADMIN_API_KEY
 * For ingest endpoints - requires INGEST_API_KEY
 */

export type AuthResult = 
  | { authenticated: true; type: "admin" | "ingest" }
  | { authenticated: false; error: string };

/**
 * Validate admin API key for protected endpoints
 */
export function validateAdminAuth(request: NextRequest): AuthResult {
  const apiKey = request.headers.get("x-api-key");
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    console.warn("ADMIN_API_KEY not configured - admin endpoints disabled");
    return { authenticated: false, error: "Admin access not configured" };
  }

  if (!apiKey) {
    return { authenticated: false, error: "Missing x-api-key header" };
  }

  if (apiKey !== adminKey) {
    return { authenticated: false, error: "Invalid API key" };
  }

  return { authenticated: true, type: "admin" };
}

/**
 * Validate ingest API key for parser endpoints
 */
export function validateIngestAuth(request: NextRequest): AuthResult {
  const apiKey = request.headers.get("x-api-key");
  const ingestKey = process.env.INGEST_API_KEY;

  if (!ingestKey) {
    console.warn("INGEST_API_KEY not configured");
    return { authenticated: false, error: "Ingest access not configured" };
  }

  if (!apiKey) {
    return { authenticated: false, error: "Missing x-api-key header" };
  }

  if (apiKey !== ingestKey) {
    return { authenticated: false, error: "Invalid API key" };
  }

  return { authenticated: true, type: "ingest" };
}

/**
 * Check if request is from localhost (for dev mode)
 */
export function isLocalRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

/**
 * Validate auth with dev mode bypass
 * In development, localhost requests are allowed without API key
 */
export function validateAuthWithDevBypass(
  request: NextRequest,
  validator: (req: NextRequest) => AuthResult
): AuthResult {
  // Allow localhost in development
  if (process.env.NODE_ENV === "development" && isLocalRequest(request)) {
    return { authenticated: true, type: "admin" };
  }
  
  return validator(request);
}

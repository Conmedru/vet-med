import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "./session";
import { validateAdminAuth, validateAuthWithDevBypass } from "./simple";

export async function isAdminRequestAuthorized(request: NextRequest): Promise<boolean> {
  const user = await getAuthUser();
  if (user) return true;

  const auth = validateAuthWithDevBypass(request, validateAdminAuth);
  return auth.authenticated;
}

export async function requireAdminRouteAuth(request: NextRequest): Promise<NextResponse | null> {
  const authorized = await isAdminRequestAuthorized(request);
  if (authorized) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

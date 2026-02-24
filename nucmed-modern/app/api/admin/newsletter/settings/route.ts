import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth, getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

const SETTINGS_KEY = "newsletter_settings";
const DEFAULT_SETTINGS = {
  enabled: true,
  dayOfWeek: 1, // Monday
  hour: 9,      // 9:00 AM
  timezone: "Europe/Moscow" // Fixed for now or configurable
};

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: SETTINGS_KEY },
    });

    return NextResponse.json(config?.value || DEFAULT_SETTINGS);
  } catch (error) {
    console.error("Failed to get newsletter settings:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    
    // Validate body roughly
    const settings = {
      enabled: Boolean(body.enabled),
      dayOfWeek: Number(body.dayOfWeek),
      hour: Number(body.hour),
      timezone: body.timezone || "Europe/Moscow"
    };

    await prisma.systemConfig.upsert({
      where: { key: SETTINGS_KEY },
      create: {
        key: SETTINGS_KEY,
        value: settings,
        description: "Configuration for automatic weekly newsletter digest"
      },
      update: {
        value: settings
      }
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Failed to save newsletter settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

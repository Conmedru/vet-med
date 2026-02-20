import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRouteAuth } from "@/lib/auth";

const DEFAULT_SETTINGS = {
  site_name: "VetMed",
  site_description: "Новости ветеринарной медицины",
  articles_per_page: 10,
  auto_publish: false,
  require_review: true,
  scrape_interval_hours: 6,
  ai_processing_enabled: true,
  ai_model: "claude-3-sonnet",
  email_notifications: false,
  telegram_notifications: false,
  telegram_bot_token: "",
  telegram_chat_id: "",
};

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const configs = await prisma.systemConfig.findMany();
    
    const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    
    for (const config of configs) {
      settings[config.key] = config.value;
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAdminRouteAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Settings object is required" },
        { status: 400 }
      );
    }

    const updates = [];
    
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key },
          update: { 
            value: value as object,
            updatedAt: new Date(),
          },
          create: {
            key,
            value: value as object,
            description: `Setting: ${key}`,
          },
        })
      );
    }

    await prisma.$transaction(updates);

    const allConfigs = await prisma.systemConfig.findMany();
    const updatedSettings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const config of allConfigs) {
      updatedSettings[config.key] = config.value;
    }

    return NextResponse.json({ settings: updatedSettings, success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

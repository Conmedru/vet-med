import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth, getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unisender } from "@/lib/unisender";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // 1. Get Subscriber Counts from local DB
    const [totalSubscribers, activeSubscribers, digestSubscribers] = await Promise.all([
      prisma.subscriber.count(),
      prisma.subscriber.count({ where: { status: "active" } }),
      prisma.subscriber.count({ where: { status: "active", digestEnabled: true } }),
    ]);

    // 2. Get Campaign Stats from DB
    const totalCampaigns = await prisma.newsletterCampaign.count();
    
    // Get last sent campaign
    const lastCampaign = await prisma.newsletterCampaign.findFirst({
        where: { status: 'SENT' },
        orderBy: { sentAt: 'desc' }
    });
    
    return NextResponse.json({
      subscribers: {
        total: totalSubscribers,
        active: activeSubscribers,
        digest: digestSubscribers,
      },
      campaigns: {
        total: totalCampaigns,
        lastSent: lastCampaign ? {
            subject: lastCampaign.subject,
            sentAt: lastCampaign.sentAt,
            stats: lastCampaign.stats
        } : null
      }
    });

  } catch (error) {
    console.error("Failed to get newsletter stats:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}

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
    // 1. Fetch recent campaigns from DB
    const campaigns = await prisma.newsletterCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 2. Sync stats for recent SENT campaigns (e.g. top 5) that have externalId
    // We do this in background or as part of request? 
    // For admin dashboard, doing it on load for top 5 is acceptable latency usually.
    const campaignsToSync = campaigns.filter(c => 
        c.status === 'SENT' && 
        c.externalId && 
        c.type === 'DIGEST' // Focus on digests mainly
    ).slice(0, 5);

    await Promise.allSettled(campaignsToSync.map(async (camp) => {
        try {
            if (!camp.externalId) return;
            
            const statsRes = await unisender.getCampaignCommonStats(camp.externalId);
            if (statsRes.result) {
                // Unisender returns result like: { total: 100, sent: 100, delivered: 98, read_unique: 40, clicked_unique: 5, ... }
                await prisma.newsletterCampaign.update({
                    where: { id: camp.id },
                    data: { 
                        stats: statsRes.result,
                        recipientCount: parseInt(statsRes.result.sent || statsRes.result.total || 0)
                    }
                });
                // Update local object for response
                camp.stats = statsRes.result;
                camp.recipientCount = parseInt(statsRes.result.sent || statsRes.result.total || 0);
            }
        } catch (e) {
            console.error(`Failed to sync stats for campaign ${camp.id}:`, e);
        }
    }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Failed to get campaigns:", error);
    return NextResponse.json({ error: "Failed to get campaigns" }, { status: 500 });
  }
}

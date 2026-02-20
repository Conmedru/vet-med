import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyDigest, saveDigestToDb, sendWeeklyDigest } from "@/lib/newsletter";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/digest
 * Weekly Digest Generation and Sending
 * Runs hourly via Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const apiKey = request.headers.get("x-api-key");

    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isApiKeyValid = apiKey === process.env.ADMIN_API_KEY;

    if (!isVercelCron && !isApiKeyValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Settings
    const settingsConfig = await prisma.systemConfig.findUnique({
      where: { key: "newsletter_settings" },
    });
    // Default settings if not configured
    const settings = (settingsConfig?.value as any) || { 
      enabled: true, 
      dayOfWeek: 1, // Monday
      hour: 9,      // 9:00
      timezone: "Europe/Moscow" 
    };

    if (!settings.enabled) {
      return NextResponse.json({ message: "Automatic digest is disabled" });
    }

    // 3. Check Schedule
    const timeZone = settings.timezone || "Europe/Moscow";
    const now = new Date();
    
    // Get current day and hour in the configured timezone
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' });
    const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false });
    
    const currentDayStr = dayFormatter.format(now);
    const currentHourStr = hourFormatter.format(now);
    
    const daysMap: Record<string, number> = {
        "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6
    };
    
    const currentDay = daysMap[currentDayStr];
    const currentHour = parseInt(currentHourStr);

    // If manual override (force=true) skip schedule check
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    if (!force) {
        if (currentDay !== settings.dayOfWeek || currentHour !== settings.hour) {
            return NextResponse.json({ 
                message: "Skipping: Not the scheduled time",
                config: { day: settings.dayOfWeek, hour: settings.hour, tz: timeZone },
                current: { day: currentDay, hour: currentHour }
            });
        }

        // 4. Check for duplicates (if already sent recently)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCampaign = await prisma.newsletterCampaign.findFirst({
            where: {
                type: 'DIGEST',
                status: 'SENT',
                createdAt: { gt: oneDayAgo }
            }
        });

        if (recentCampaign) {
            return NextResponse.json({ 
                message: "Skipping: Digest already sent in the last 24h", 
                campaignId: recentCampaign.id 
            });
        }
    }

    console.log("[Cron Digest] Starting weekly digest generation...");

    // 5. Determine Week Offset
    // If sending Mon-Wed, we likely want LAST week (offset 1).
    // If sending Thu-Sun, we likely want THIS week (offset 0).
    const weekOffset = (settings.dayOfWeek >= 1 && settings.dayOfWeek <= 3) ? 1 : 0;

    // Generate digest
    const digest = await generateWeeklyDigest(weekOffset);

    if (digest.articles.length === 0) {
      console.log("[Cron Digest] No articles found, skipping.");
      return NextResponse.json({ success: true, message: "No articles to send" });
    }

    // Save SystemConfig digest record
    await saveDigestToDb(digest);

    // 6. Send & Log
    try {
        const sendResult = await sendWeeklyDigest(digest);
        return NextResponse.json({
            success: true,
            digestId: digest.id,
            articlesCount: digest.articles.length,
            sendResult
        });
    } catch (sendError) {
        console.error("Failed to send digest:", sendError);
        
        // Log FAILED attempt to DB for Admin Tracing
        try {
           await prisma.newsletterCampaign.create({
               data: {
                   subject: digest.subject,
                   type: 'DIGEST',
                   status: 'FAILED',
                   content: digest.html,
                   metadata: { 
                       error: sendError instanceof Error ? sendError.message : String(sendError),
                       digestId: digest.id,
                       scheduled: true,
                       weekOffset
                   }
               }
           });
        } catch (dbError) { 
            console.error("Failed to log failed campaign:", dbError); 
        }

        return NextResponse.json({ 
            error: "Digest generation succeeded but sending failed", 
            details: String(sendError) 
        }, { status: 500 });
    }

  } catch (error) {
    console.error("[Cron Digest] Critical Failure:", error);
    return NextResponse.json(
      { 
        error: "Critical failure", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

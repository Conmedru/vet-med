import { NextRequest, NextResponse } from "next/server";
import { validateAuthWithDevBypass, validateAdminAuth, getAuthUser } from "@/lib/auth";
import { generateWeeklyDigest, saveDigestToDb, getRecentDigests, sendWeeklyDigest } from "@/lib/newsletter";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    const authResult = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const digests = await getRecentDigests(10);
    return NextResponse.json({ digests });
  } catch (error) {
    console.error("Failed to get digests:", error);
    return NextResponse.json({ error: "Failed to get digests" }, { status: 500 });
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
    const body = await request.json().catch(() => ({}));
    const weekOffset = body.weekOffset || 0;
    const shouldSend = body.send === true;

    const digest = await generateWeeklyDigest(weekOffset);
    await saveDigestToDb(digest);

    let sendResult = null;
    if (shouldSend) {
       try {
         sendResult = await sendWeeklyDigest(digest);
       } catch (sendError) {
         console.error("Failed to send digest:", sendError);
         
         // Log FAILED attempt
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
                        articleCount: digest.articles.length,
                        dateRange: digest.dateRange 
                    }
                }
            });
         } catch (e) { console.error("Failed to log failed campaign", e); }

         return NextResponse.json({ 
           success: false, 
           digest: {
             id: digest.id,
             subject: digest.subject,
             articleCount: digest.articles.length,
             stats: digest.stats,
           },
           error: "Digest saved but failed to send: " + (sendError instanceof Error ? sendError.message : String(sendError))
         });
       }
    } else {
        // Log DRAFT/GENERATED
         try {
            await prisma.newsletterCampaign.create({
                data: {
                    subject: digest.subject,
                    type: 'DIGEST',
                    status: 'DRAFT',
                    content: digest.html,
                    metadata: { 
                        digestId: digest.id,
                        articleCount: digest.articles.length,
                        dateRange: digest.dateRange 
                    }
                }
            });
         } catch (e) { console.error("Failed to log draft campaign", e); }
    }

    return NextResponse.json({
      success: true,
      digest: {
        id: digest.id,
        subject: digest.subject,
        articleCount: digest.articles.length,
        stats: digest.stats,
      },
      sendResult
    });
  } catch (error) {
    console.error("Failed to generate digest:", error);
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}

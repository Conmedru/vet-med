import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewArticleNotification } from "@/lib/newsletter";

/**
 * GET /api/cron/publish
 * Автоматическая публикация запланированных статей
 * Запускается каждые 5 минут (или по расписанию Vercel Cron)
 * 
 * Находит все статьи со статусом SCHEDULED и scheduledAt <= now
 * и переводит их в статус PUBLISHED
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации для cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const apiKey = request.headers.get("x-api-key");

    // Vercel Cron использует Authorization: Bearer <CRON_SECRET>
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isApiKeyValid = apiKey === process.env.ADMIN_API_KEY;

    if (!isVercelCron && !isApiKeyValid) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    console.log(`[Cron Publish] Checking for scheduled articles at ${now.toISOString()}...`);

    // Найти все статьи, которые должны быть опубликованы
    const articlesToPublish = await prisma.article.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        title: true,
        titleOriginal: true,
        scheduledAt: true,
      },
    });

    if (articlesToPublish.length === 0) {
      console.log("[Cron Publish] No articles to publish");
      return NextResponse.json({
        success: true,
        message: "No articles to publish",
        published: 0,
      });
    }

    console.log(`[Cron Publish] Found ${articlesToPublish.length} articles to publish`);

    // Публикуем каждую статью
    const results = [];
    for (const article of articlesToPublish) {
      try {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
          },
        });

        // Log activity
        await prisma.activityLog.create({
          data: {
            action: "article.auto_published",
            entityType: "article",
            entityId: article.id,
            metadata: {
              actor: "system",
              title: article.title || article.titleOriginal,
              scheduledAt: article.scheduledAt?.toISOString(),
              publishedAt: now.toISOString(),
            },
          },
        });

        // Trigger newsletter notification
        console.log(`[Cron Publish] Triggering newsletter for ${article.id}`);
        sendNewArticleNotification(article.id).catch(err => {
            console.error(`[Cron Publish] Failed to send newsletter for ${article.id}:`, err);
        });

        results.push({
          id: article.id,
          title: article.title || article.titleOriginal,
          status: "published",
        });

        console.log(`[Cron Publish] Published: ${article.title || article.titleOriginal}`);
      } catch (error) {
        console.error(`[Cron Publish] Error publishing ${article.id}:`, error);
        results.push({
          id: article.id,
          title: article.title || article.titleOriginal,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.status === "published").length;
    const errorCount = results.filter(r => r.status === "error").length;

    console.log(`[Cron Publish] Completed: ${successCount} published, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      published: successCount,
      errors: errorCount,
      results,
    });

  } catch (error) {
    console.error("[Cron Publish] Error:", error);
    return NextResponse.json(
      { 
        error: "Cron publish failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

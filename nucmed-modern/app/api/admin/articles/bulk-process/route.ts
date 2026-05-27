import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRouteAuth } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

/**
 * POST /api/admin/articles/bulk-process
 * Массовая обработка и публикация застрявших статей:
 * - FAILED → INGESTED (для повторной обработки)
 * - DRAFT без обложки → запуск генерации обложки
 * - SCHEDULED с прошедшей датой → PUBLISHED
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdminRouteAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const { action = "process" } = body; // "process" | "publish" | "reset"

  const results = {
    reset: 0,
    published: 0,
    errors: [] as string[],
  };

  try {
    // 1. Reset FAILED articles to INGESTED
    if (action === "process" || action === "reset") {
      const failedArticles = await prisma.article.findMany({
        where: { status: "FAILED" },
        select: { id: true, title: true },
      });

      if (failedArticles.length > 0) {
        await prisma.article.updateMany({
          where: { status: "FAILED" },
          data: { 
            status: "INGESTED", 
            processingError: null,
          },
        });
        results.reset = failedArticles.length;
        console.log(`[BulkProcess] Reset ${failedArticles.length} FAILED articles to INGESTED`);
      }
    }

    // 2. Publish SCHEDULED articles with past scheduledAt date
    if (action === "publish" || action === "process") {
      const now = new Date();
      const scheduledToPublish = await prisma.article.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: { lte: now },
        },
        select: { id: true, title: true, scheduledAt: true },
      });

      for (const article of scheduledToPublish) {
        try {
          await prisma.article.update({
            where: { id: article.id },
            data: { 
              status: "PUBLISHED",
              publishedAt: now,
            },
          });
          results.published++;
        } catch (err) {
          results.errors.push(`Failed to publish ${article.id}: ${err}`);
        }
      }
      console.log(`[BulkProcess] Published ${results.published} scheduled articles`);
    }

    // 3. Revalidate cache
    revalidatePath("/");
    revalidatePath("/articles");
    revalidatePath("/admin/articles");

    return NextResponse.json({
      success: true,
      results,
      message: `Processed: ${results.reset} reset, ${results.published} published`,
    });

  } catch (error) {
    console.error("[BulkProcess] Error:", error);
    return NextResponse.json(
      { error: "Failed to process articles", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/articles/bulk-process
 * Статистика застрявших статей
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminRouteAuth(request);
  if (authError) return authError;

  const now = new Date();

  const [
    failedCount,
    scheduledPastCount,
    draftWithoutCover,
    processingCount,
  ] = await Promise.all([
    prisma.article.count({ where: { status: "FAILED" } }),
    prisma.article.count({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now },
      },
    }),
    prisma.article.count({
      where: {
        status: "DRAFT",
        coverImageUrl: null,
      },
    }),
    prisma.article.count({ where: { status: "PROCESSING" } }),
  ]);

  // Get sample of failed articles
  const failedArticles = await prisma.article.findMany({
    where: { status: "FAILED" },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      processingError: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    stats: {
      failed: failedCount,
      scheduledPast: scheduledPastCount,
      draftWithoutCover: draftWithoutCover,
      processing: processingCount,
    },
    failedArticles,
    needsAction: failedCount + scheduledPastCount > 0,
  });
}

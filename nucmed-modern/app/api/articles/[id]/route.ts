import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminAuth, validateAuthWithDevBypass, getAuthUser } from "@/lib/auth";
import { ArticleUpdateSchema } from "@/lib/schemas/article";
import { revalidatePath } from "next/cache";
import { sendNewArticleNotification } from "@/lib/newsletter";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/articles/[id]
 * Получить статью по ID (публичный endpoint)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        source: true,
        images: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Article fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/articles/[id]
 * Обновить статью (редактирование в админке)
 * Требует авторизации
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Session cookie auth (browser) or API key auth (scripts)
  const user = await getAuthUser();
  if (!user) {
    const auth = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
  }

  const { id } = await params;

  try {
    const body = await request.json();
    console.log(`[API/Articles/${id}] Incoming PATCH request. Body:`, JSON.stringify(body, null, 2));

    // Валидация входных данных
    const parseResult = ArticleUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      console.error("Validation error:", JSON.stringify(parseResult.error.flatten(), null, 2));
      console.error("Received body:", JSON.stringify(body, null, 2));
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Проверяем существование статьи
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      console.warn(`[API/Articles/${id}] Article not found in database`);
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    console.log(`[API/Articles/${id}] Existing status: ${existing.status}`);

    // Логика автоматической смены статуса при изменении даты публикации
    let newStatus = data.status;

    if (!newStatus && data.scheduledAt !== undefined) {
      // Если установлена дата и статус DRAFT -> переводим в SCHEDULED
      if (data.scheduledAt && existing.status === 'DRAFT') {
        newStatus = 'SCHEDULED';
      }
      // Если дата очищена и статус SCHEDULED -> возвращаем в DRAFT
      else if (data.scheduledAt === null && existing.status === 'SCHEDULED') {
        newStatus = 'DRAFT';
      }
    }

    // Если переводим статью в PUBLISHED и publishedAt не задано — ставим текущую дату
    const targetStatus = newStatus || data.status || existing.status;
    const shouldAutoSetPublishedAt =
      targetStatus === 'PUBLISHED' &&
      data.publishedAt === undefined &&
      !existing.publishedAt;

    const article = await prisma.article.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.excerpt && { excerpt: data.excerpt }),
        ...(data.category && { category: data.category }),
        ...(data.tags && { tags: data.tags }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
        ...(data.scheduledAt !== undefined && {
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null
        }),
        ...(data.publishedAt !== undefined && {
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : null
        }),
        ...(data.originalPublishedAt !== undefined && {
          originalPublishedAt: data.originalPublishedAt ? new Date(data.originalPublishedAt) : null
        }),
        ...(shouldAutoSetPublishedAt && { publishedAt: new Date() }),
        ...(newStatus && { status: newStatus }),
        ...(data.significanceScore !== undefined && { significanceScore: data.significanceScore }),
      },
      include: {
        source: true,
        images: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "article.updated",
        entityType: "article",
        entityId: article.id,
        metadata: { updatedFields: Object.keys(data) },
      },
    });

    // Handle Newsletter Notification
    // If article was just published (status changed to PUBLISHED or it was already published but we want to re-trigger? No, only on transition)
    // Simpler check: if we are setting status to PUBLISHED and it wasn't before
    console.log(`[API/Articles/${id}] Target status: ${targetStatus}, NewStatus: ${newStatus}`);
    if (newStatus === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      console.log(`[API/Articles/${id}] Newsletter trigger condition met. Article status transition to PUBLISHED.`);
      // Send notification asynchronously without blocking the response
      // Wrapping in setTimeout ensure it's pushed to the next tick and clearly detached from the current flow
      setTimeout(() => {
        console.log(`[Newsletter] Triggering background notification for article ${article.id}`);
        sendNewArticleNotification(article.id).catch(err => {
          console.error("[Newsletter] Failed to send notification:", err);
        });
      }, 0);
    }

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath("/news");
    if (article.slug) {
      revalidatePath(`/news/${article.slug}`);
    }
    if (article.category) {
      revalidatePath(`/category/${article.category.toLowerCase()}`);
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Article update error:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/articles/[id]
 * Удалить статью
 * Требует авторизации
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Session cookie auth (browser) or API key auth (scripts)
  const user = await getAuthUser();
  if (!user) {
    const auth = validateAuthWithDevBypass(request, validateAdminAuth);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
  }

  const { id } = await params;

  try {
    // Проверяем существование
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await prisma.article.delete({ where: { id } });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "article.deleted",
        entityType: "article",
        entityId: id,
        metadata: { title: existing.titleOriginal },
      },
    });

    // Revalidate cached pages after deletion
    revalidatePath("/");
    revalidatePath("/news");
    if (existing.slug) {
      revalidatePath(`/news/${existing.slug}`);
    }
    if (existing.category) {
      revalidatePath(`/category/${existing.category.toLowerCase()}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Article delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}

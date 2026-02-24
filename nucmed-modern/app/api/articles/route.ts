import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";

// ArticleStatus: INGESTED | PROCESSING | DRAFT | SCHEDULED | PUBLISHED | ARCHIVED | FAILED
type ArticleStatus = "INGESTED" | "PROCESSING" | "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED" | "FAILED";

const CreateArticleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  titleOriginal: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  contentOriginal: z.string().optional(),
  excerpt: z.string().optional(),
  excerptOriginal: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
});

// Helper to ensure unique slug
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.article.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!existing) return slug;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * GET /api/articles
 * Список статей с фильтрацией и поиском
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status") as ArticleStatus | null;
  const category = searchParams.get("category");
  const sourceId = searchParams.get("sourceId");
  const search = searchParams.get("search");
  const skip = parseInt(searchParams.get("skip") || "0");
  const take = parseInt(searchParams.get("take") || "20");
  const sort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";

  try {
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }
    if (sourceId) {
      where.sourceId = sourceId;
    }

    // Search in title and titleOriginal
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { titleOriginal: { contains: search.trim(), mode: "insensitive" } },
        { excerpt: { contains: search.trim(), mode: "insensitive" } },
        { content: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take,
        orderBy: sort === "oldest"
          ? [
            { originalPublishedAt: "asc" },
            { publishedAt: "asc" },
            { createdAt: "asc" },
          ]
          : [
            { originalPublishedAt: "desc" },
            { publishedAt: "desc" },
            { createdAt: "desc" },
          ],
        select: {
          id: true,
          slug: true,
          title: true,
          titleOriginal: true,
          excerpt: true,
          category: true,
          status: true,
          significanceScore: true,
          coverImageUrl: true,
          createdAt: true,
          publishedAt: true,
          originalPublishedAt: true,
          scheduledAt: true,
          viewedAt: true,
          source: {
            select: { name: true, slug: true },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      items: articles,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Articles list error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch articles", details: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}

/**
 * Get or create a "manual" source for user-created articles
 */
async function getManualSource() {
  const MANUAL_SOURCE_SLUG = "manual";

  let source = await prisma.source.findUnique({
    where: { slug: MANUAL_SOURCE_SLUG },
  });

  if (!source) {
    source = await prisma.source.create({
      data: {
        name: "Редакция",
        slug: MANUAL_SOURCE_SLUG,
        url: "https://vetmed.ru",
        adapterType: "manual",
        isActive: true,
      },
    });
  }

  return source;
}

/**
 * POST /api/articles
 * Create a new manual article
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const manualSource = await getManualSource();
    const externalId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const titleToSlug = data.title || data.titleOriginal || "untitled";
    const baseSlug = generateSlug(titleToSlug);
    const uniqueSlug = await ensureUniqueSlug(baseSlug);

    const article = await prisma.article.create({
      data: {
        sourceId: manualSource.id,
        slug: uniqueSlug,
        externalId,
        externalUrl: data.externalUrl || "",
        title: data.title,
        titleOriginal: data.titleOriginal || data.title,
        content: data.content,
        contentOriginal: data.contentOriginal || data.content,
        excerpt: data.excerpt || null,
        excerptOriginal: data.excerptOriginal || data.excerpt || null,
        category: data.category || null,
        tags: data.tags || [],
        coverImageUrl: data.coverImageUrl || null,
        status: data.status,
        language: "ru",
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      },
      include: {
        source: { select: { name: true, slug: true } },
      },
    });

    // Revalidate cached pages when article is published
    if (data.status === "PUBLISHED") {
      revalidatePath("/");
      revalidatePath("/news");
      revalidatePath(`/news/${uniqueSlug}`);
      if (data.category) {
        revalidatePath(`/category/${data.category.toLowerCase()}`);
      }
    }

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Article creation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create article", details: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}

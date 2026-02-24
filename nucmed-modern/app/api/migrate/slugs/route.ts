import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/slug";
import { validateAdminAuth, validateAuthWithDevBypass } from "@/lib/auth";

// Helper to ensure unique slug
async function ensureUniqueSlug(baseSlug: string, articleId: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.article.findFirst({
      where: { 
        slug,
        NOT: { id: articleId }
      },
      select: { id: true }
    });
    
    if (!existing) return slug;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function POST(request: NextRequest) {
  const auth = validateAuthWithDevBypass(request, validateAdminAuth);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const articles = await prisma.article.findMany({
      where: { slug: null },
      select: { id: true, title: true, titleOriginal: true }
    });

    console.log(`Found ${articles.length} articles without slugs`);

    let updated = 0;
    for (const article of articles) {
      const titleToSlug = article.title || article.titleOriginal;
      if (!titleToSlug) continue;

      const baseSlug = generateSlug(titleToSlug);
      const uniqueSlug = await ensureUniqueSlug(baseSlug, article.id);

      await prisma.article.update({
        where: { id: article.id },
        data: { slug: uniqueSlug }
      });
      updated++;
    }

    return NextResponse.json({ 
      success: true, 
      processed: articles.length, 
      updated 
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Migration failed" }, { status: 500 });
  }
}

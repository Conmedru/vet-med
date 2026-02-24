import { MetadataRoute } from 'next'
import { categories, getCategorySlug } from '@/lib/data'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetmed.ru'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Articles from database - only published
    const dbArticles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 5000, // Increased limit for larger sites
    })

    const articleUrls = dbArticles.map((article: { id: string; slug: string | null; publishedAt: Date | null; updatedAt: Date }) => ({
      url: `${BASE_URL}/news/${article.slug || article.id}`,
      lastModified: article.publishedAt || article.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    const categoryUrls = categories.map((category) => ({
      url: `${BASE_URL}/category/${getCategorySlug(category)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))

    // Static pages (excluding /privacy and /terms - they have noindex)
    const staticPages = [
      { url: `${BASE_URL}/news`, priority: 0.9 },
      { url: `${BASE_URL}/about`, priority: 0.5 },
      { url: `${BASE_URL}/contact`, priority: 0.5 },
    ].map(page => ({
      ...page,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
    }))

    return [
      {
        url: BASE_URL,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      ...staticPages,
      ...categoryUrls,
      ...articleUrls,
    ]
  } catch (error) {
    console.error('Sitemap generation failed:', error)
    return [
      {
        url: BASE_URL,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ]
  }
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Calendar, Clock, ExternalLink, Tag, User, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ReadingProgress } from "@/components/ui/reading-progress";
import { ShareButtons } from "@/components/shared";
import { prisma } from "@/lib/prisma";
import { getCategorySlug } from "@/lib/data";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import type { Metadata } from "next";
import type { Image as PrismaImage } from "@prisma/client";

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vetmed.ru";
const SITE_NAME = "VetMed";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getArticle(slugOrId: string) {
  // Try to find by slug first
  let article = await prisma.article.findUnique({
    where: { slug: slugOrId, status: "PUBLISHED" },
    include: {
      source: { select: { name: true, slug: true, url: true } },
      images: true,
    },
  });

  // If not found, try by ID (backwards compatibility)
  if (!article) {
    article = await prisma.article.findUnique({
      where: { id: slugOrId, status: "PUBLISHED" },
      include: {
        source: { select: { name: true, slug: true, url: true } },
        images: true,
      },
    });
  }

  return article;
}

async function getRelatedArticles(articleId: string, category: string | null) {
  try {
    const related = await prisma.article.findMany({
      where: {
        id: { not: articleId },
        status: "PUBLISHED",
        ...(category ? { category } : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        titleOriginal: true,
        excerpt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
    });
    return related.map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title || a.titleOriginal,
      excerpt: a.excerpt,
    }));
  } catch (error) {
    console.error("Failed to fetch related articles:", error);
    return [];
  }
}

function estimateReadingTime(content: string | null): number {
  if (!content) return 1;
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function generateArticleJsonLd(article: NonNullable<Awaited<ReturnType<typeof getArticle>>>) {
  const articleUrl = `${SITE_URL}/news/${article.slug || article.id}`;
  const title = article.title || article.titleOriginal;
  const readingTime = estimateReadingTime(article.content);
  const displayDate = article.originalPublishedAt || article.publishedAt || article.createdAt;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": articleUrl,
    headline: title,
    alternativeHeadline: article.titleOriginal !== title ? article.titleOriginal : undefined,
    description: article.excerpt || undefined,
    datePublished: displayDate.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: article.source?.name || SITE_NAME,
      url: article.source?.url || SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: article.category || undefined,
    keywords: article.tags?.join(", ") || undefined,
    inLanguage: "ru-RU",
    wordCount: article.content?.split(/\s+/).length || 0,
    timeRequired: `PT${readingTime}M`,
    isAccessibleForFree: true,
    ...(article.coverImageUrl && {
      image: {
        "@type": "ImageObject",
        url: article.coverImageUrl,
        width: 1200,
        height: 630,
      },
      thumbnailUrl: article.coverImageUrl,
    }),
  };
}

function generateBreadcrumbJsonLd(article: NonNullable<Awaited<ReturnType<typeof getArticle>>>) {
  const title = article.title || article.titleOriginal;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Новости",
        item: `${SITE_URL}/news`,
      },
      ...(article.category ? [{
        "@type": "ListItem",
        position: 3,
        name: article.category,
        item: `${SITE_URL}/category/${getCategorySlug(article.category)}`,
      }] : []),
      {
        "@type": "ListItem",
        position: article.category ? 4 : 3,
        name: title.slice(0, 50),
      },
    ],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "Статья не найдена" };
  }

  const articleUrl = `${SITE_URL}/news/${article.slug || article.id}`;
  const title = article.title || article.titleOriginal;
  const displayDate = article.originalPublishedAt || article.publishedAt || article.createdAt;

  // SEO-optimized description with category context
  const categoryPrefix = article.category ? `[${article.category}] ` : "";
  const baseDescription = article.excerpt || article.content?.slice(0, 160) || "";
  const description = `${categoryPrefix}${baseDescription}`.slice(0, 160);

  // SEO-optimized title with category for context
  const seoTitle = article.category
    ? `${title} | ${article.category} | ${SITE_NAME}`
    : `${title} | ${SITE_NAME}`;

  return {
    title: seoTitle,
    description,
    keywords: article.tags?.length
      ? [...article.tags, article.category, "ветеринария", "животные"].filter(Boolean).join(", ")
      : undefined,
    authors: article.source?.name ? [{ name: article.source.name }] : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      url: articleUrl,
      siteName: SITE_NAME,
      locale: "ru_RU",
      publishedTime: displayDate.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      section: article.category || undefined,
      tags: article.tags || undefined,
      ...(article.coverImageUrl && {
        images: [{
          url: article.coverImageUrl,
          alt: title,
          width: 1200,
          height: 630,
        }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(article.coverImageUrl && { images: [article.coverImageUrl] }),
    },
    alternates: {
      canonical: articleUrl,
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  // SEO: Redirect to canonical URL if slug doesn't match (e.g. accessed by ID when slug exists)
  const canonicalSlug = article.slug || article.id;
  if (slug !== canonicalSlug) {
    redirect(`/news/${canonicalSlug}`);
  }

  const displayDate = article.originalPublishedAt || article.publishedAt || article.createdAt;

  const relatedArticles = await getRelatedArticles(article.id, article.category);
  const readingTime = estimateReadingTime(article.content);
  const articleJsonLd = generateArticleJsonLd(article);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(article);

  return (
    <>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="container py-8 md:py-12 max-w-3xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Новости", href: "/news" },
            ...(article.category ? [{ label: article.category, href: `/category/${getCategorySlug(article.category)}` }] : []),
            { label: article.title || article.titleOriginal }
          ]}
          className="mb-8"
        />

        <article itemScope itemType="https://schema.org/Article">
          {/* Header */}
          <header className="mb-10 pb-8 border-b">
            <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
              {article.category && (
                <Badge variant="secondary" className="font-medium">
                  {article.category}
                </Badge>
              )}
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <time
                  dateTime={displayDate.toISOString()}
                  itemProp="datePublished"
                >
                  {format(new Date(displayDate), "d MMMM yyyy", { locale: ru })}
                </time>
              </span>
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {readingTime} мин. чтения
              </span>
              {article.source && (
                <span className="text-muted-foreground flex items-center gap-1.5" itemProp="author" itemScope itemType="https://schema.org/Organization">
                  <User className="h-3.5 w-3.5" />
                  <span itemProp="name">{article.source.name}</span>
                </span>
              )}
            </div>

            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] mb-6"
              itemProp="headline"
            >
              {article.title || article.titleOriginal}
            </h1>

            {article.excerpt && (
              <p
                className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light"
                itemProp="description"
              >
                {article.excerpt}
              </p>
            )}

            {/* Cover Image */}
            {(article.coverImageUrl || article.images?.find((img: PrismaImage) => img.isCover)) && (
              <div className="mt-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.coverImageUrl || article.images?.find((img: PrismaImage) => img.isCover)?.originalUrl || article.images?.[0]?.originalUrl}
                  alt={article.title || article.titleOriginal}
                  className="w-full rounded-lg object-cover max-h-[500px]"
                  itemProp="image"
                />
                {article.images?.find((img: PrismaImage) => img.isCover)?.caption && (
                  <p className="text-sm text-muted-foreground mt-2 text-center italic">
                    {article.images.find((img: PrismaImage) => img.isCover)?.caption}
                  </p>
                )}
              </div>
            )}
          </header>

          {/* Content */}
          <div
            className="prose prose-lg max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:leading-relaxed prose-p:text-foreground/90
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-ul:my-4 prose-li:my-1
              prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
            itemProp="articleBody"
          >
            {article.content ? (
              <ReactMarkdown>{article.content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">
                Содержание статьи недоступно
              </p>
            )}
          </div>

          {/* Tags & Share */}
          <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {article.tags.map((tag: string) => (
                  <Link key={tag} href={`/news?tag=${encodeURIComponent(tag)}`}>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
            <ShareButtons
              title={article.title || article.titleOriginal}
              url={`${SITE_URL}/news/${article.slug || article.id}`}
            />
          </div>

          {/* Source Attribution — client-required format */}
          {(article.externalUrl || article.source) && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-foreground/80">
                <span className="font-medium">Источник: </span>
                {article.source?.name || ""}
                {article.externalUrl && (
                  <>
                    {" "}
                    <a
                      href={article.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {article.source?.url || article.externalUrl}
                      <ExternalLink className="h-3.5 w-3.5 inline-block" />
                    </a>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Image Gallery */}
          {article.images && article.images.length > 1 && (
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Изображения ({article.images.length})</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {article.images.map((image: PrismaImage) => (
                  <a
                    key={image.id}
                    href={image.storedUrl || image.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square bg-muted rounded-lg overflow-hidden border hover:border-primary transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.storedUrl || image.originalUrl}
                      alt={image.caption || "Image"}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    {image.isCover && (
                      <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
                        Обложка
                      </Badge>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-16 pt-8 border-t">
            <h2 className="text-xl font-bold mb-6">Читайте также</h2>
            <div className="grid gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/news/${related.slug || related.id}`}
                  className="group block"
                >
                  <h3 className="font-medium group-hover:text-primary transition-colors">
                    {related.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {related.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

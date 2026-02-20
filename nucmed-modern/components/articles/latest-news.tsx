"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ToggleLeft, ToggleRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { DBArticle } from "@/lib/articles";
import { SponsoredPostCard } from "./sponsored-post-card";
import type { SponsoredPostData } from "./sponsored-post-card";

interface LatestNewsProps {
  articles: DBArticle[];
  sponsoredPosts?: SponsoredPostData[];
  maxArticles?: number;
}

const SPONSORED_INTERVAL = 4;

export function LatestNews({ articles, sponsoredPosts = [], maxArticles = 10 }: LatestNewsProps) {
  const [headlinesOnly, setHeadlinesOnly] = useState(false);
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const displayArticles = articles.slice(0, maxArticles);

  // Build mixed feed: insert sponsored posts at intervals
  const feedItems: Array<{ type: "article"; data: DBArticle } | { type: "sponsored"; data: SponsoredPostData }> = [];
  let sponsoredIdx = 0;

  displayArticles.forEach((article, i) => {
    feedItems.push({ type: "article", data: article });
    // After every SPONSORED_INTERVAL articles, inject a sponsored post
    if (
      sponsoredIdx < sponsoredPosts.length &&
      (i + 1) % SPONSORED_INTERVAL === 0
    ) {
      feedItems.push({ type: "sponsored", data: sponsoredPosts[sponsoredIdx] });
      sponsoredIdx++;
    }
  });

  // Track impressions for visible sponsored posts (fire once per session)
  useEffect(() => {
    sponsoredPosts.forEach((sp) => {
      if (!trackedIds.has(sp.id)) {
        fetch(`/api/sponsored/${sp.id}/impression`, { method: "POST" }).catch(() => {});
        setTrackedIds((prev) => new Set(prev).add(sp.id));
      }
    });
  }, [sponsoredPosts, trackedIds]);

  return (
    <section>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
            Последние новости
          </h2>
          <Link 
            href="/news" 
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-foreground/20 rounded-full hover:bg-foreground hover:text-background transition-colors"
          >
            Все новости
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        
        {/* Headlines Only Toggle */}
        <button
          onClick={() => setHeadlinesOnly(!headlinesOnly)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto"
        >
          <span className="uppercase tracking-wider text-xs font-medium">
            Только заголовки
          </span>
          {headlinesOnly ? (
            <ToggleRight className="h-6 w-6 text-primary" />
          ) : (
            <ToggleLeft className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mixed Feed: Articles + Sponsored */}
      <div className="divide-y divide-border">
        {feedItems.map((item, index) =>
          item.type === "sponsored" ? (
            <SponsoredPostCard
              key={`sp-${item.data.id}`}
              post={item.data}
              variant="row"
            />
          ) : (
            <ArticleRow
              key={item.data.id}
              article={item.data}
              headlinesOnly={headlinesOnly}
              index={index}
            />
          )
        )}
      </div>

      {/* Mobile: See All Link */}
      <div className="mt-6 sm:hidden">
        <Link 
          href="/news" 
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Смотреть все новости
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

interface ArticleRowProps {
  article: DBArticle;
  headlinesOnly: boolean;
  index: number;
}

function ArticleRow({ article, headlinesOnly, index }: ArticleRowProps) {
  const title = article.title || article.titleOriginal;
  // Use original source date if available, otherwise our publication date
  const date = article.originalPublishedAt || article.publishedAt || article.createdAt;
  const articleUrl = `/news/${article.slug || article.id}`;

  if (headlinesOnly) {
    return (
      <article 
        className="py-5 group"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex flex-col gap-2">
          {/* Category Label */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {article.category || "Новости"}
            </span>
          </div>
          
          {/* Title */}
          <Link href={articleUrl} className="group/link">
            <h3 className="text-lg md:text-xl font-semibold leading-tight group-hover/link:text-primary transition-colors">
              {title}
            </h3>
          </Link>
          
          {/* Meta: Tags + Source + Date */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {article.tags && article.tags.length > 0 && (
              <>
                {article.tags.slice(0, 4).map((tag, i) => (
                  <span key={tag} className="flex items-center">
                    <Link 
                      href={`/news?tag=${encodeURIComponent(tag)}`}
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {tag}
                    </Link>
                    {i < Math.min(article.tags.length - 1, 3) && (
                      <span className="mx-1.5 text-muted-foreground/50">•</span>
                    )}
                  </span>
                ))}
                <span className="mx-1 text-muted-foreground/50">•</span>
              </>
            )}
            {article.source && (
              <>
                <span>{article.source.name}</span>
                <span className="text-muted-foreground/50">•</span>
              </>
            )}
            <span>
              {format(new Date(date), "d MMM yyyy", { locale: ru })}
            </span>
          </div>
        </div>
      </article>
    );
  }

  // With Image Version
  return (
    <article 
      className="py-6 group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex gap-5">
        {/* Thumbnail */}
        {article.coverImageUrl && (
          <Link href={articleUrl} className="flex-shrink-0">
            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden bg-muted">
              <Image
                src={article.coverImageUrl}
                alt={title}
                fill
                sizes="150px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </Link>
        )}
        
        {/* Content */}
        <div className="flex flex-col justify-center gap-2 min-w-0 flex-1">
          {/* Category */}
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {article.category || "Новости"}
          </span>
          
          {/* Title */}
          <Link href={articleUrl} className="group/link">
            <h3 className="text-lg md:text-xl font-semibold leading-tight group-hover/link:text-primary transition-colors line-clamp-2">
              {title}
            </h3>
          </Link>
          
          {/* Source + Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {article.source && (
              <span className="font-medium">{article.source.name}</span>
            )}
            {article.source && <span className="text-muted-foreground/50">–</span>}
            <span>
              {format(new Date(date), "d MMMM yyyy, HH:mm", { locale: ru })}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

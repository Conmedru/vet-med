"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ToggleLeft, ToggleRight, ArrowRight, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { DBArticle } from "@/lib/articles";

interface NewsListProps {
  articles: any[]; // Using any[] to be compatible with the type in page.tsx which matches DBArticle structure
}

export function NewsList({ articles }: NewsListProps) {
  const [headlinesOnly, setHeadlinesOnly] = useState(false);

  return (
    <div>
      {/* Controls */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setHeadlinesOnly(!headlinesOnly)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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

      {/* List */}
      <div className={headlinesOnly ? "divide-y divide-border" : "space-y-8"}>
        {articles.map((article, index) => (
          <NewsItem 
            key={article.id} 
            article={article} 
            headlinesOnly={headlinesOnly}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

interface NewsItemProps {
  article: any;
  headlinesOnly: boolean;
  index: number;
}

function NewsItem({ article, headlinesOnly, index }: NewsItemProps) {
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
          
          {/* Meta: Tags + Date */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {article.tags && article.tags.length > 0 && (
              <>
                {article.tags.slice(0, 4).map((tag: string, i: number) => (
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
            <span>
              {format(new Date(date), "d MMM yyyy", { locale: ru })}
            </span>
          </div>
        </div>
      </article>
    );
  }

  // Full card version with cover image support
  return (
    <article className="group border-b pb-8 last:border-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Cover Image (if available) */}
        {article.coverImageUrl && (
          <div className="md:col-span-1">
            <Link href={articleUrl} className="block relative aspect-video md:aspect-[4/3] overflow-hidden rounded-lg bg-muted">
              <Image
                src={article.coverImageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
          </div>
        )}

        {/* Content */}
        <div className={`flex flex-col gap-3 ${article.coverImageUrl ? "md:col-span-3" : "md:col-span-4"}`}>
          <div className="flex items-center gap-3 text-sm">
            {article.category && (
              <Badge variant="secondary" className="text-xs">
                {article.category}
              </Badge>
            )}
            <span className="text-muted-foreground">
              {article.source?.name}
            </span>
            <span className="text-muted-foreground">
              {format(new Date(date), "d MMMM yyyy", { locale: ru })}
            </span>
          </div>

          <Link href={articleUrl}>
            <h2 className="text-xl md:text-2xl font-semibold group-hover:text-primary transition-colors leading-tight mb-2">
              {title}
            </h2>
          </Link>

          {article.excerpt && (
            <p className="text-muted-foreground line-clamp-2 mb-2">
              {article.excerpt}
            </p>
          )}

          <div className="flex items-center gap-2 text-sm text-primary font-medium mt-auto">
            <Link href={articleUrl} className="flex items-center gap-1 hover:underline">
              Читать далее
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

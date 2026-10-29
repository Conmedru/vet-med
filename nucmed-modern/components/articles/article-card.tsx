import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, User } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateUTC } from "@/lib/utils/date";
import type { DBArticle } from "@/lib/articles";

interface DBArticleCardProps {
  article: DBArticle;
  variant?: "default" | "compact" | "horizontal";
}

function estimateReadingTime(content: string | null): string {
  if (!content) return "1 мин";
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} мин`;
}

export function DBArticleCard({ article, variant = "default" }: DBArticleCardProps) {
  const title = article.title || article.titleOriginal;
  // Use original source date if available, otherwise our publication date
  const date = article.originalPublishedAt || article.publishedAt || article.createdAt;
  const readTime = "1 мин";
  // Use slug if available, fallback to id for backward compatibility
  const articleUrl = `/news/${article.slug || article.id}`;

  if (variant === "horizontal") {
    return (
      <Card className="flex flex-col md:flex-row gap-4 overflow-hidden rounded-[24px] border border-white/80 bg-white/60 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-md">
        {article.coverImageUrl && (
          <div className="relative w-full md:w-1/3 aspect-video md:aspect-auto md:min-h-[140px] bg-muted overflow-hidden rounded-[18px]">
            <Image
              src={article.coverImageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
        )}
        <div className={`flex flex-col justify-center px-1 py-2 md:py-1 ${article.coverImageUrl ? "md:w-2/3" : "w-full"}`}>
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            {article.category && (
              <Badge variant="secondary" className="hover:bg-secondary/80">
                {article.category}
              </Badge>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateUTC(date, "d MMM yyyy")}
            </span>
          </div>
          <Link href={articleUrl} className="group">
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>
          </Link>
          {article.excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
            {article.source && (
              <>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {article.source.name}
                </span>
                <span>•</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readTime}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <div className="group flex gap-4 items-start">
        {article.coverImageUrl && (
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={article.coverImageUrl}
              alt={title}
              fill
              sizes="80px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            <span className="text-primary">{article.category || "Новости"}</span>
          </div>
          <Link href={articleUrl}>
            <h4 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h4>
          </Link>
          <span className="text-xs text-muted-foreground mt-auto flex items-center gap-1">
            {formatDateUTC(date, "d MMM")} • {readTime}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/65 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_20px_50px_-28px_rgba(11,42,51,0.28)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-lg">
      {article.coverImageUrl && (
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <Badge className="absolute top-3 left-3 z-10 rounded-full border border-white/50 bg-white/30 text-white backdrop-blur-md hover:bg-white/40 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
            {article.category || "Новости"}
          </Badge>
          <Image
            src={article.coverImageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      )}
      {!article.coverImageUrl && (
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <Badge className="absolute top-3 left-3 z-10 bg-background/90 text-foreground backdrop-blur-sm">
            {article.category || "Новости"}
          </Badge>
          <span className="text-4xl font-bold text-primary/20">н</span>
        </div>
      )}
      <CardContent className="flex-1 p-5">
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateUTC(date, "d MMMM yyyy")}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readTime}
          </span>
        </div>
        <Link href={articleUrl} className="group">
          <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>
        {article.excerpt && (
          <p className="text-muted-foreground text-sm line-clamp-3">
            {article.excerpt}
          </p>
        )}
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between border-t border-border/60 px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{article.source?.name || "CON-VET.ru"}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

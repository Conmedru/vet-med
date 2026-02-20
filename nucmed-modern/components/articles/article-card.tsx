import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, User } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
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
  const readTime = estimateReadingTime(article.content);
  // Use slug if available, fallback to id for backward compatibility
  const articleUrl = `/news/${article.slug || article.id}`;

  if (variant === "horizontal") {
    return (
      <Card className="flex flex-col md:flex-row overflow-hidden hover:shadow-md transition-shadow duration-300 border-none bg-transparent shadow-none">
        {article.coverImageUrl && (
          <div className="relative w-full md:w-1/3 aspect-video md:aspect-auto bg-muted overflow-hidden rounded-lg">
            <Image
              src={article.coverImageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
            />
          </div>
        )}
        <div className={`flex flex-col justify-center p-4 ${article.coverImageUrl ? "md:w-2/3" : "w-full"}`}>
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            {article.category && (
              <Badge variant="secondary" className="hover:bg-secondary/80">
                {article.category}
              </Badge>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(date), "d MMM yyyy", { locale: ru })}
            </span>
          </div>
          <Link href={articleUrl} className="group">
            <h3 className="text-xl font-serif font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
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
            <h4 className="font-serif font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h4>
          </Link>
          <span className="text-xs text-muted-foreground mt-auto flex items-center gap-1">
            {format(new Date(date), "d MMM", { locale: ru })} • {readTime}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col border-none shadow-sm ring-1 ring-border/50">
      {article.coverImageUrl && (
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <Badge className="absolute top-3 left-3 z-10 bg-background/90 text-foreground backdrop-blur-sm hover:bg-background/100">
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
          <span className="text-4xl font-serif font-bold text-primary/20">н</span>
        </div>
      )}
      <CardContent className="flex-1 p-5">
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(date), "d MMMM yyyy", { locale: ru })}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readTime}
          </span>
        </div>
        <Link href={articleUrl} className="group">
          <h3 className="text-lg font-serif font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>
        {article.excerpt && (
          <p className="text-muted-foreground text-sm line-clamp-3">
            {article.excerpt}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-5 pt-0 mt-auto flex items-center justify-between border-t bg-muted/20 px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{article.source?.name || "VetMed"}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

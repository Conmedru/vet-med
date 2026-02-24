"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SponsoredPostData {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  targetUrl: string;
  advertiserName: string | null;
  category: string | null;
}

interface SponsoredPostCardProps {
  post: SponsoredPostData;
  variant?: "default" | "row";
}

export function SponsoredPostCard({ post, variant = "default" }: SponsoredPostCardProps) {
  const handleClick = () => {
    // Track click (fire-and-forget)
    fetch(`/api/sponsored/${post.id}/click`, { method: "POST" }).catch(() => {});
    window.open(post.targetUrl, "_blank", "noopener,noreferrer");
  };

  // Row variant — matches ArticleRow in LatestNews
  if (variant === "row") {
    return (
      <article className="py-6 group cursor-pointer" onClick={handleClick}>
        <div className="flex gap-5">
          {/* Thumbnail */}
          {post.coverImageUrl && (
            <div className="flex-shrink-0">
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={post.coverImageUrl}
                  alt={post.title}
                  fill
                  sizes="150px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex flex-col justify-center gap-2 min-w-0 flex-1">
            {/* Category + Sponsored indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {post.category || "Партнерский материал"}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
                <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg md:text-xl font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>

            {/* Source + meta */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {post.advertiserName && (
                <span className="font-medium">{post.advertiserName}</span>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Default card variant — matches DBArticleCard default
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col border-none shadow-sm ring-1 ring-border/50 cursor-pointer"
      onClick={handleClick}
    >
      {post.coverImageUrl ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <Badge className="absolute top-3 left-3 z-10 bg-background/90 text-foreground backdrop-blur-sm hover:bg-background/100">
            {post.category || "Партнерский материал"}
          </Badge>
          <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-amber-50/90 text-amber-700 backdrop-blur-sm border border-amber-100/50">
            <ExternalLink className="w-3 h-3" />
          </span>
          <Image
            src={post.coverImageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      ) : (
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/50 flex items-center justify-center">
          <Badge className="absolute top-3 left-3 z-10 bg-background/90 text-foreground backdrop-blur-sm">
            {post.category || "Партнерский материал"}
          </Badge>
          <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-amber-50/90 text-amber-700 backdrop-blur-sm border border-amber-100/50">
            <ExternalLink className="w-3 h-3" />
          </span>
          <span className="text-4xl font-serif font-bold text-amber-200">P</span>
        </div>
      )}
      <CardContent className="flex-1 p-5">
        <h3 className="text-lg font-serif font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-muted-foreground text-sm line-clamp-3">{post.description}</p>
        )}
      </CardContent>
      <CardFooter className="p-5 pt-0 mt-auto flex items-center justify-between border-t bg-muted/20 px-5 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {post.advertiserName || "Партнерский материал"}
        </div>
      </CardFooter>
    </Card>
  );
}

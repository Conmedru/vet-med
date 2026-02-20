"use client"

import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight } from "lucide-react";
import type { DBArticle } from "@/lib/articles";

interface DBArticleSidebarProps {
  articles: DBArticle[];
  className?: string;
  currentArticleId?: string;
}

export function DBArticleSidebar({ articles, className, currentArticleId }: DBArticleSidebarProps) {
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex flex-col gap-3 mb-4 px-1">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg uppercase tracking-tight">Лента новостей</h3>
        </div>
        <Link 
          href="/news" 
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
        >
          Все новости
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      
      <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
        <div className="flex flex-col gap-0 border-l border-border/50 ml-2">
          {articles.map((article) => {
            const isActive = currentArticleId === article.id;
            const title = article.title || article.titleOriginal;
            // Use original source date if available, otherwise our publication date
            const date = article.originalPublishedAt || article.publishedAt || article.createdAt;
            
            return (
              <div key={article.id} className="relative pl-4 pb-4 group">
                {/* Timeline dot */}
                <div className={cn(
                  "absolute -left-[5px] top-[6px] h-2.5 w-2.5 rounded-full border-2 border-background transition-all duration-300",
                  isActive 
                    ? "bg-primary scale-125 ring-4 ring-primary/20" 
                    : "bg-muted-foreground/30 group-hover:bg-primary group-hover:scale-125"
                )} />
                
                <Link href={`/news/${article.slug || article.id}`} className="block">
                  <div className="flex items-baseline gap-1.5 mb-1 text-[10px] uppercase tracking-wider font-semibold">
                    <span className={cn(
                      "transition-colors",
                      isActive ? "text-primary font-bold" : "text-muted-foreground group-hover:text-primary"
                    )}>
                      {article.category || "Новости"}
                    </span>
                    <span className="text-muted-foreground/50 shrink-0">·</span>
                    <span className="text-muted-foreground/70 shrink-0 whitespace-nowrap">
                      {format(new Date(date), "d MMM", { locale: ru }).toUpperCase()}
                    </span>
                  </div>
                  
                  <h4 className={cn(
                    "font-medium text-sm leading-snug transition-colors line-clamp-2",
                    isActive ? "text-primary font-bold" : "text-foreground/90 group-hover:text-primary"
                  )}>
                    {title}
                  </h4>
                </Link>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center gap-1 text-sm text-muted-foreground flex-wrap", className)}
    >
      <Link 
        href="/" 
        className="flex items-center hover:text-primary transition-colors"
        aria-label="Главная"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-primary transition-colors truncate max-w-[200px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[300px]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

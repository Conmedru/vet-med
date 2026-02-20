import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  className?: string;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  baseUrl,
  className 
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    const qs = params.toString();
    return `${baseUrl}${qs ? `?${qs}` : ""}`;
  };

  // Logic to show pages with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={currentPage <= 1}
        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
      >
        <Link href={createPageUrl(currentPage - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, i) => (
          typeof page === "number" ? (
            <Button
              key={i}
              variant={currentPage === page ? "default" : "ghost"}
              size="icon"
              asChild
              className={cn("w-9 h-9", currentPage === page && "pointer-events-none")}
            >
              <Link href={createPageUrl(page)}>
                {page}
              </Link>
            </Button>
          ) : (
            <div key={i} className="flex items-center justify-center w-9 h-9">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
          )
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={currentPage >= totalPages}
        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
      >
        <Link href={createPageUrl(currentPage + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

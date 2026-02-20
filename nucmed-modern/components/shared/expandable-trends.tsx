"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ExpandableTrendsProps {
  tags: string[]
  initialCount?: number
}

export function ExpandableTrends({ tags, initialCount = 3 }: ExpandableTrendsProps) {
  const [expanded, setExpanded] = useState(false)

  if (tags.length === 0) return null

  const visibleTags = expanded ? tags : tags.slice(0, initialCount)
  const hasMore = tags.length > initialCount

  return (
    <div className="space-y-2" suppressHydrationWarning>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Тренды
      </span>
      <div className="flex flex-wrap gap-1.5">
        {visibleTags.map((tag) => (
          <Link key={tag} href={`/news?tag=${encodeURIComponent(tag)}`}>
            <Badge 
              variant="secondary" 
              className="text-xs cursor-pointer bg-sky-100 text-sky-900 hover:bg-sky-200 border-0 font-medium transition-colors"
            >
              {tag}
            </Badge>
          </Link>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-sky-700 transition-colors mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Показать ещё {tags.length - initialCount}
            </>
          )}
        </button>
      )}
    </div>
  )
}

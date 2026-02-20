"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, FileText, Loader2, X } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

interface SearchResult {
  id: string
  slug?: string | null
  title: string
  excerpt?: string | null
  category?: string | null
  publishedAt?: string | null
  highlightTitle?: string
  highlightExcerpt?: string
  rank?: number
}

export function SearchDialog() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [data, setData] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Keyboard shortcut ⌘K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery("")
      setData([])
      setSelectedIndex(0)
    }
  }, [open])

  // Fetch search results
  React.useEffect(() => {
    if (query.length < 2) {
      setData([])
      return
    }

    const fetchArticles = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search/fast?q=${encodeURIComponent(query)}&limit=8`)
        const json = await res.json()
        setData(json.results || [])
        setSelectedIndex(0)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(fetchArticles, 200)
    return () => clearTimeout(timeoutId)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, data.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && data[selectedIndex]) {
      e.preventDefault()
      navigateToArticle(data[selectedIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const navigateToArticle = (article: SearchResult) => {
    setOpen(false)
    router.push(`/news/${article.slug || article.id}`)
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-9 p-0 xl:h-10 xl:w-80 xl:justify-start xl:px-3 xl:py-2 text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Поиск...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="overflow-hidden p-0 shadow-lg max-w-2xl"
          aria-describedby="search-description"
        >
          <DialogTitle className="sr-only">Поиск статей</DialogTitle>
          <p id="search-description" className="sr-only">
            Введите запрос для поиска статей по заголовку, содержимому и тегам
          </p>

          {/* Search Input */}
          <div className="flex items-center border-b px-4 py-3">
            <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Поиск по статьям, тегам, категориям..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && query.length >= 2 && data.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Ничего не найдено по запросу "{query}"
              </div>
            )}

            {!loading && query.length < 2 && (
              <div className="py-8 text-center text-muted-foreground">
                Введите минимум 2 символа для поиска
              </div>
            )}

            {!loading && data.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Найдено: {data.length} статей
                </div>
                {data.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/news/${article.slug || article.id}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg px-3 py-3 cursor-pointer transition-colors",
                      index === selectedIndex
                        ? "bg-muted text-foreground"
                        : "hover:bg-muted/50"
                    )}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-medium text-sm leading-snug"
                          dangerouslySetInnerHTML={{
                            __html: article.highlightTitle || article.title
                          }}
                        />
                        {article.highlightExcerpt && (
                          <div
                            className="text-xs text-muted-foreground mt-1 line-clamp-2"
                            dangerouslySetInnerHTML={{
                              __html: article.highlightExcerpt
                            }}
                          />
                        )}
                        {article.category && (
                          <span className="inline-block text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-2">
                            {article.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> навигация</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> открыть</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> закрыть</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

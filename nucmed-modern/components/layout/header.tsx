"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ChevronDown, Cat, Dog, Rat, Bird, Bug, Tractor, Apple } from "lucide-react"
import { Button } from "@/components/ui/button"
import { animalCategoryGroups, getCategorySlug } from "@/lib/data"
import { SearchDialog } from "@/components/search"
import { cn } from "@/lib/utils"
import { SubscribeDialog } from "@/components/dialogs/subscribe-dialog"

const petSubcategories = animalCategoryGroups["Питомцы"]

const topLevelSections: Array<{
  name: string
  slug: string
  icon: React.ElementType
  shortName?: string
}> = [
  { name: "Экзоты", slug: "exotics", icon: Bug },
  { name: "Сельскохозяйственные животные", slug: "farm-animals", icon: Tractor, shortName: "С/х животные" },
  { name: "Нутрициология", slug: "nutrition", icon: Apple },
]

const petIcons: Record<string, React.ElementType> = {
  "Кошки": Cat,
  "Собаки": Dog,
  "Грызуны": Rat,
  "Птицы, попугаи": Bird,
}

export function Header({ trendingTags = [] }: { trendingTags?: string[] }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [isPetsOpen, setIsPetsOpen] = React.useState(false)
  const [isMobilePetsOpen, setIsMobilePetsOpen] = React.useState(false)
  const pathname = usePathname()
  const petsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (petsRef.current && !petsRef.current.contains(event.target as Node)) {
        setIsPetsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isPetsCategoryActive = petSubcategories.some(
    (cat) => pathname === `/category/${getCategorySlug(cat)}`
  ) || pathname === "/category/pets"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-20 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0 flex items-center -my-2">
            <img
              src="/logo.png"
              alt="CON-VET.ru"
              className="h-24 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5">
            {/* Питомцы dropdown */}
            <div className="relative" ref={petsRef}>
              <button
                onClick={() => setIsPetsOpen(!isPetsOpen)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  isPetsOpen || isPetsCategoryActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Питомцы
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isPetsOpen && "rotate-180")} />
              </button>

              {isPetsOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border bg-popover p-2 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                  <Link
                    href="/category/pets"
                    onClick={() => setIsPetsOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-md transition-colors font-medium",
                      pathname === "/category/pets"
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    Все питомцы
                  </Link>
                  <div className="my-1 border-t border-border/50" />
                  {petSubcategories.map((cat) => {
                    const href = `/category/${getCategorySlug(cat)}`
                    const isActive = pathname === href
                    const Icon = petIcons[cat]
                    return (
                      <Link
                        key={cat}
                        href={href}
                        onClick={() => setIsPetsOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-md transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        {cat}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top-level category links */}
            {topLevelSections.map((section) => {
              const href = `/category/${section.slug}`
              const isActive = pathname === href
              return (
                <Link
                  key={section.slug}
                  href={href}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {"shortName" in section ? section.shortName : section.name}
                </Link>
              )
            })}

            <Link
              href="/news"
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                pathname === "/news"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              Все новости
            </Link>

            <Link
              href="/journal"
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                pathname === "/journal"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              Журнал
            </Link>
          </nav>
        </div>

        {/* Right: Search + Subscribe + Mobile menu */}
        <div className="flex items-center gap-2">
          <SearchDialog />

          <SubscribeDialog />

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Открыть меню"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Меню</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 space-y-1">
            {/* Питомцы — expandable */}
            <button
              onClick={() => setIsMobilePetsOpen(!isMobilePetsOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                isPetsCategoryActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              Питомцы
              <ChevronDown className={cn("h-4 w-4 transition-transform", isMobilePetsOpen && "rotate-180")} />
            </button>

            {isMobilePetsOpen && (
              <div className="pl-4 space-y-0.5">
                <Link
                  href="/category/pets"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2 text-sm rounded-md transition-colors",
                    pathname === "/category/pets" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  Все питомцы
                </Link>
                {petSubcategories.map((cat) => {
                  const href = `/category/${getCategorySlug(cat)}`
                  const isActive = pathname === href
                  const Icon = petIcons[cat]
                  return (
                    <Link
                      key={cat}
                      href={href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                        isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {cat}
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Top-level sections */}
            {topLevelSections.map((section) => {
              const href = `/category/${section.slug}`
              const isActive = pathname === href
              return (
                <Link
                  key={section.slug}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  {section.name}
                </Link>
              )
            })}

            <div className="pt-3 pb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Навигация
            </div>

            <Link
              href="/news"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "block px-3 py-2.5 text-sm rounded-md transition-colors",
                pathname === "/news" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
              )}
            >
              Все новости
            </Link>

            <Link
              href="/journal"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "block px-3 py-2.5 text-sm rounded-md transition-colors",
                pathname === "/journal" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
              )}
            >
              Журнал
            </Link>

            {/* Trending tags in mobile */}
            {trendingTags.length > 0 && (
              <>
                <div className="pt-3 pb-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Популярные теги
                </div>
                <div className="flex flex-wrap gap-2 px-3">
                  {trendingTags.slice(0, 6).map((tag) => (
                    <Link
                      key={tag}
                      href={`/news?tag=${encodeURIComponent(tag)}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-2.5 py-1 text-xs bg-muted text-muted-foreground hover:text-primary rounded-md transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>

                {/* Subscribe button in mobile */}
                <div className="pt-4 mt-4 border-t sm:hidden">
                  <SubscribeDialog
                    trigger={<Button className="w-full">Подписаться</Button>}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

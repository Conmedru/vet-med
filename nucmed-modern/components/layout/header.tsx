"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ChevronDown, Cat, Dog, Rat, Bird, Bug, Tractor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRubricsByKind, PET_SLUGS } from "@/lib/rubrics"
import { SearchDialog } from "@/components/search"
import { cn } from "@/lib/utils"
import { SubscribeDialog } from "@/components/dialogs/subscribe-dialog"
import { FEATURES } from "@/lib/config"

type MenuLink = { name: string; href: string; icon?: React.ElementType }
type MenuGroup = { title?: string; links: MenuLink[] }
type MenuDropdown = { id: string; label: string; groups: MenuGroup[] }

const animalIcons: Record<string, React.ElementType> = {
  cats: Cat,
  dogs: Dog,
  rodents: Rat,
  birds: Bird,
  exotics: Bug,
  "farm-animals": Tractor,
}

const rubricLink = (r: { slug: string; name: string; shortName?: string }): MenuLink => ({
  name: r.name,
  href: `/category/${r.slug}`,
  icon: animalIcons[r.slug],
})

const animals = getRubricsByKind("animal")

const dropdowns: MenuDropdown[] = [
  {
    id: "animals",
    label: "Животные",
    groups: [
      {
        title: "Питомцы",
        links: [
          { name: "Все питомцы", href: "/category/pets" },
          ...animals.filter((r) => PET_SLUGS.includes(r.slug)).map(rubricLink),
        ],
      },
      { title: "Другие", links: animals.filter((r) => !PET_SLUGS.includes(r.slug)).map(rubricLink) },
    ],
  },
  { id: "specialties", label: "Специализации", groups: [{ links: getRubricsByKind("specialty").map(rubricLink) }] },
  { id: "diagnostics", label: "Диагностика", groups: [{ links: getRubricsByKind("diagnostics").map(rubricLink) }] },
]

const sectionLinks: MenuLink[] = [
  ...getRubricsByKind("section").map(rubricLink),
  { name: "Гайдлайны", href: "/guidelines" },
  { name: "Калькуляторы", href: "/calculators" },
]

const dropdownHrefs = (d: MenuDropdown) => d.groups.flatMap((g) => g.links.map((l) => l.href))

export function Header({ trendingTags = [] }: { trendingTags?: string[] }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null)
  const [openMobileGroup, setOpenMobileGroup] = React.useState<string | null>(null)
  const pathname = usePathname()
  const navRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-20 flex items-center justify-between gap-2 md:gap-4">
        {/* Left: Logo */}
        <div className="flex items-center min-w-0">
          <Link href="/" className="shrink min-w-0 flex items-center">
            <img
              src="/con-vet-logo.png"
              alt="CON-VET.ru"
              className="w-full max-w-[200px] sm:max-w-[240px] md:max-w-[280px] lg:max-w-[320px] h-auto max-h-[40px] md:max-h-[50px] lg:max-h-[64px] object-contain"
            />
          </Link>
        </div>

        {/* Right: Search + Subscribe + Mobile menu */}
        <div className="flex items-center gap-2 shrink-0">
          <SearchDialog />

          <SubscribeDialog />

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Открыть меню"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Меню</span>
          </Button>
        </div>
      </div>

      {/* Desktop Navigation (second row) */}
      <div className="hidden lg:block border-t border-border/50">
        <nav ref={navRef} className="container h-12 flex items-center gap-1">
          {dropdowns.map((dropdown) => {
            const isOpen = openDropdown === dropdown.id
            const isActive = dropdownHrefs(dropdown).includes(pathname)
            return (
              <div key={dropdown.id} className="relative">
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : dropdown.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 xl:px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                    isOpen || isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {dropdown.label}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 max-h-[70vh] overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                    {dropdown.groups.map((group, index) => (
                      <React.Fragment key={group.title || index}>
                        {index > 0 && <div className="my-2 border-t border-border/50" />}
                        {group.title && (
                          <div className="px-2.5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {group.title}
                          </div>
                        )}
                        {group.links.map((link) => {
                          const Icon = link.icon
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setOpenDropdown(null)}
                              className={cn(
                                "flex items-center gap-2.5 px-2.5 py-1.5 text-sm rounded-md transition-colors",
                                pathname === link.href
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-foreground hover:bg-muted"
                              )}
                            >
                              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                              {link.name}
                            </Link>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {sectionLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-2.5 xl:px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                pathname === link.href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {link.name}
            </Link>
          ))}

          {FEATURES.PUBLIC_JOURNAL && (
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
          )}
        </nav>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t bg-background max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="container py-4 space-y-1">
            {dropdowns.map((dropdown) => {
              const isOpen = openMobileGroup === dropdown.id
              const isActive = dropdownHrefs(dropdown).includes(pathname)
              return (
                <div key={dropdown.id}>
                  <button
                    onClick={() => setOpenMobileGroup(isOpen ? null : dropdown.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    {dropdown.label}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  </button>

                  {isOpen && (
                    <div className="pl-4 space-y-0.5">
                      {dropdown.groups.flatMap((group) => group.links).map((link) => {
                        const Icon = link.icon
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                              pathname === link.href ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                            )}
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            {link.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {sectionLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "block px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                  pathname === link.href ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                {link.name}
              </Link>
            ))}

            {FEATURES.PUBLIC_JOURNAL && (
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
            )}

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

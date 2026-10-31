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
import { MemberMenu } from "@/components/layout/member-menu"
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
  // Reference catalogs after the sections (client: «Вакцинация» right after «Нутрициология»,
  // «Клинические случаи» as a big top-level section)
  {
    id: "references",
    label: "Справочники",
    groups: [{ links: [{ name: "Рекомендации и справочники", href: "/guidelines" }, { name: "Калькуляторы и шкалы", href: "/calculators" }] }],
  },
]

// Top-level sections: Нутрициология, Вакцинация, Клинические случаи
const sectionLinks: MenuLink[] = getRubricsByKind("section").map(rubricLink)

const dropdownHrefs = (d: MenuDropdown) => d.groups.flatMap((g) => g.links.map((l) => l.href))

const navItem = "flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 xl:px-3 py-2 text-[14px] font-medium transition-colors"

/**
 * Site header: one row on desktop, transparent over the page top and frosted glass once the
 * page scrolls. Menus open on click/Enter and close on Esc, outside click and navigation.
 */
export function Header({ trendingTags = [] }: { trendingTags?: string[] }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null)
  const [openMobileGroup, setOpenMobileGroup] = React.useState<string | null>(null)
  const [scrolled, setScrolled] = React.useState(false)
  const pathname = usePathname()
  const navRef = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null)
        setIsMobileMenuOpen(false)
      }
    }
    function handleScroll() {
      setScrolled(window.scrollY > 8)
    }
    handleScroll()
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKey)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKey)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Close menus after client-side navigation
  React.useEffect(() => {
    setOpenDropdown(null)
    setIsMobileMenuOpen(false)
  }, [pathname])

  const solid = scrolled || isMobileMenuOpen

  const renderDropdown = (dropdown: MenuDropdown) => {
    const isOpen = openDropdown === dropdown.id
    const isActive = dropdownHrefs(dropdown).includes(pathname)
    return (
      <div key={dropdown.id} className="relative">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setOpenDropdown(isOpen ? null : dropdown.id)}
          className={cn(navItem, isOpen ? "bg-white text-foreground shadow-sm" : isActive ? "bg-white/70 text-primary" : "text-foreground hover:bg-white/70")}
        >
          {dropdown.label}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-[calc(100%+10px)] z-50 max-h-[70vh] w-72 overflow-y-auto rounded-[20px] border border-border bg-white p-2 shadow-[0_24px_60px_-20px_rgba(11,42,51,0.35)] animate-in fade-in zoom-in-95 duration-100">
            {dropdown.groups.map((group, index) => (
              <React.Fragment key={group.title || index}>
                {index > 0 && <div className="my-2 border-t border-border/60" />}
                {group.title && (
                  <div className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</div>
                )}
                {group.links.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpenDropdown(null)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors",
                        pathname === link.href ? "bg-secondary font-medium text-primary" : "text-foreground hover:bg-secondary"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 text-primary" />}
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
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-[background-color,border-color,box-shadow] duration-300",
        solid
          ? "border-white/70 bg-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_10px_30px_-24px_rgba(11,42,51,0.45)] backdrop-blur-2xl backdrop-saturate-150"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center gap-3 xl:h-[68px]">
        <Link href="/" className="shrink-0">
          <img src="/con-vet-logo.png" alt="CON-VET.ru" className="h-8 w-auto md:h-9" />
        </Link>


        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <SearchDialog />
          <MemberMenu />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-white/80 xl:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

    {/* Desktop navigation: second row, seven sections do not fit next to search and sign-in */}
      <nav ref={navRef} className="container hidden h-12 items-center gap-0.5 xl:flex" aria-label="Разделы сайта">
        {dropdowns.slice(0, 3).map(renderDropdown)}

        {sectionLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(navItem, pathname === link.href ? "bg-white/70 text-primary" : "text-foreground hover:bg-white/70")}
          >
            {link.name}
          </Link>
        ))}

        {dropdowns.slice(3).map(renderDropdown)}

        {FEATURES.PUBLIC_JOURNAL && (
          <Link href="/journal" className={cn(navItem, pathname.startsWith("/journal") ? "bg-white/70 text-primary" : "text-foreground hover:bg-white/70")}>
            Журнал
          </Link>
        )}
      </nav>

      {/* Mobile navigation */}
      {isMobileMenuOpen && (
        <div className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-white/70 xl:hidden">
          <div className="container space-y-4 py-4">
            {dropdowns.map((dropdown) => {
              const isOpen = openMobileGroup === dropdown.id
              return (
                <div key={dropdown.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenMobileGroup(isOpen ? null : dropdown.id)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-semibold text-foreground hover:bg-white/70"
                  >
                    {dropdown.label}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
                      {dropdown.groups.flatMap((group) => group.links).map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-[13px] ring-1 transition-colors",
                            pathname === link.href ? "bg-primary text-primary-foreground ring-primary" : "bg-white text-foreground ring-border"
                          )}
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="grid gap-1 border-t border-border/60 pt-3">
              {sectionLinks.map((link) => (
                <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2.5 text-[15px] font-medium text-foreground hover:bg-white/70">
                  {link.name}
                </Link>
              ))}
              {FEATURES.PUBLIC_JOURNAL && (
                <Link href="/journal" className="rounded-xl px-3 py-2.5 text-[15px] font-medium text-foreground hover:bg-white/70">
                  Журнал
                </Link>
              )}
            </div>

            <div className="md:hidden">
              <MemberMenu mobile />
            </div>

            <SubscribeDialog trigger={<Button variant="outline" className="w-full rounded-xl">Подписаться на дайджест</Button>} />

            {trendingTags.length > 0 && (
              <div>
                <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Популярные теги</div>
                <div className="flex flex-wrap gap-2 px-3">
                  {trendingTags.slice(0, 6).map((tag) => (
                    <Link
                      key={tag}
                      href={`/news?tag=${encodeURIComponent(tag)}`}
                      className="rounded-lg bg-white/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

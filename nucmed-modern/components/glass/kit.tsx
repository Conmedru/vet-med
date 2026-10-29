import Link from "next/link";
import Image from "next/image";
import { PawPrint, ArrowRight, ArrowUpRight, Bird, BookOpen, Calculator, CalendarDays, Cat, Dog, MapPin, Rabbit, Salad, Stethoscope, Syringe, Turtle, type LucideIcon } from "lucide-react";
import { formatDateUTC } from "@/lib/utils/date";
import type { DBArticle } from "@/lib/articles";
import type { EventApiItem } from "@/lib/schemas/events";
import type { VetDate } from "@/lib/vet-dates";
import type { HomeData as _HomeData } from "@/lib/home-data";
import { primaryRubricName } from "@/lib/rubrics";


/** Shared helpers for article cards */
export function articleTitle(article: DBArticle) {
  return article.title || article.titleOriginal;
}

export function articleHref(article: DBArticle) {
  return `/news/${article.slug || article.id}`;
}

export function articleDate(article: DBArticle) {
  return article.originalPublishedAt || article.publishedAt || article.createdAt;
}

export function rubricLabel(article: DBArticle) {
  return primaryRubricName(article.rubrics) || article.category || "Новости";
}

export function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/**
 * D — «Стекло и градиенты». Reference lock:
 * Ready (frosted glass panels tinted by color behind them), Sleeve/Playful (glossy gradient squircle icons),
 * Vivid/Stocketa (soft colour washes on a light canvas). Brand teal stays the anchor; each gradient keeps one role.
 */
/**
 * Placeholder for an article whose cover is missing (generation failed; cron/process
 * fills it later): brand gradient with soft light and the CON-VET paw, not a black block.
 */
export function CoverFallback({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden bg-gradient-to-br from-[#0e7490] via-[#0b5b70] to-[#123a63] ${className}`}>
      <div className="absolute -right-10 -top-10 h-2/3 w-2/3 rounded-full bg-[#5eead4] opacity-30 blur-3xl" />
      <div className="absolute -bottom-12 -left-8 h-1/2 w-1/2 rounded-full bg-[#a78bfa] opacity-30 blur-3xl" />
      <PawPrint className="absolute left-1/2 top-[38%] h-1/4 w-1/4 -translate-x-1/2 -translate-y-1/2 text-white/25" strokeWidth={1.4} />
    </div>
  );
}

export const GRADIENTS = {
  lavender: { tile: "from-[#efeaff] via-[#e6e4ff] to-[#d9e6ff]", icon: "from-[#8b7bff] to-[#5b4fd1]", glow: "shadow-[0_10px_24px_-8px_rgba(91,79,209,0.55)]", ink: "text-[#2f2775]" },
  sky: { tile: "from-[#e6f1ff] via-[#dcecff] to-[#d4f3ff]", icon: "from-[#4aa8ff] to-[#2563eb]", glow: "shadow-[0_10px_24px_-8px_rgba(37,99,235,0.5)]", ink: "text-[#173a7a]" },
  mint: { tile: "from-[#e4f9ee] via-[#dcf5e6] to-[#e9f7d8]", icon: "from-[#34d399] to-[#0f8a5f]", glow: "shadow-[0_10px_24px_-8px_rgba(15,138,95,0.5)]", ink: "text-[#0f4a31]" },
  sand: { tile: "from-[#fbf3e6] via-[#f6efe4] to-[#eef0f2]", icon: "from-[#5b6b73] to-[#1f3640]", glow: "shadow-[0_10px_24px_-8px_rgba(31,54,64,0.45)]", ink: "text-[#1f3640]" },
  teal: { tile: "from-[#ddf6f8] via-[#d6f1f6] to-[#e0f0ff]", icon: "from-[#22c3d6] to-[#0e7490]", glow: "shadow-[0_10px_24px_-8px_rgba(14,116,144,0.55)]", ink: "text-[#0b4553]" },
} as const;

export const TILES: { title: string; description: string; href: string; icon: LucideIcon; tone: keyof typeof GRADIENTS; countKey?: string; meta?: string }[] = [
  { title: "Клинические случаи", description: "Разборы реальных случаев", href: "/category/clinical-cases", icon: Stethoscope, tone: "lavender", countKey: "clinical-cases" },
  { title: "Вакцинация", description: "Схемы, вакцины, реакции", href: "/category/vaccination", icon: Syringe, tone: "sky", countKey: "vaccination" },
  { title: "Нутрициология", description: "Кормление и диеты", href: "/category/nutrition", icon: Salad, tone: "mint", countKey: "nutrition" },
  { title: "Рекомендации", description: "WSAVA, AAHA, РФ", href: "/guidelines", icon: BookOpen, tone: "sand", meta: "справочник" },
  { title: "Калькуляторы", description: "Дозы, инфузии, ППТ", href: "/calculators", icon: Calculator, tone: "teal", meta: "внешние сервисы" },
];

/** Frosted glass panel: translucent white over the colour wash, hairline light border, inner top highlight */
export const GLASS =
  "rounded-[28px] border border-white/70 bg-white/55 shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_20px_50px_-24px_rgba(11,42,51,0.25)] backdrop-blur-2xl backdrop-saturate-150";

export function GlossyIcon({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: keyof typeof GRADIENTS; size?: "sm" | "md" }) {
  const g = GRADIENTS[tone];
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br text-white ${g.icon} ${g.glow} ${size === "md" ? "h-12 w-12" : "h-9 w-9 rounded-[11px]"}`}
    >
      {/* glossy highlight */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 to-transparent" />
      <Icon className={`relative ${size === "md" ? "h-6 w-6" : "h-[18px] w-[18px]"}`} strokeWidth={2.2} />
    </span>
  );
}

export function Heading({ title, href, kicker, flush = false }: { title: string; href?: string; kicker?: string; flush?: boolean }) {
  return (
    <div className={`flex items-end justify-between gap-4 ${flush ? "" : "mb-5"}`}>
      <div>
        {kicker && <div className="mb-1 text-[13px] font-semibold text-[#0e7490]">{kicker}</div>}
        <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#0b2a33] md:text-[32px] [text-wrap:balance]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-[#0b2a33] shadow-sm backdrop-blur-xl hover:bg-white">
          Все <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export function Card({ article, lead = false }: { article: DBArticle; lead?: boolean }) {
  return (
    <Link href={articleHref(article)} className="group flex h-full flex-col">
      <div className={`relative overflow-hidden rounded-[22px] bg-[#e6eef0] ${lead ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        {!article.coverImageUrl && <CoverFallback />}
        {article.coverImageUrl && (
          <Image src={article.coverImageUrl} alt="" fill sizes={lead ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 768px) 100vw, 33vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        )}
        {/* liquid-glass chip over the photo */}
        <span className="absolute left-3 top-3 rounded-full border border-white/50 bg-white/30 px-3 py-1 text-[12px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.5)_inset] backdrop-blur-md [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
          {rubricLabel(article)}
        </span>
      </div>
      <div className="px-1 pt-3">
        <h3 className={`font-bold leading-snug tracking-[-0.01em] text-[#0b2a33] transition-colors group-hover:text-[#0e7490] [text-wrap:balance] ${lead ? "text-[26px] md:text-[32px] md:leading-[1.12]" : "line-clamp-3 text-[17px]"}`}>
          {articleTitle(article)}
        </h3>
        {lead && article.excerpt && <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-[#4a6670]">{article.excerpt}</p>}
        <div className="mt-2 text-[13px] text-[#6b8189]">
          {formatDateUTC(articleDate(article), "d MMMM yyyy")}
          {article.source?.name && <> · {article.source.name}</>}
        </div>
      </div>
    </Link>
  );
}

export function Row({ article }: { article: DBArticle }) {
  return (
    <Link href={articleHref(article)} className="group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/70">
      {!article.coverImageUrl && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px]">
          <CoverFallback />
        </div>
      )}
      {article.coverImageUrl && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-[#e6eef0]">
          <Image src={article.coverImageUrl} alt="" fill sizes="64px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[12px] font-semibold text-[#0e7490]">{rubricLabel(article)}</div>
        <h4 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#0b2a33]">{articleTitle(article)}</h4>
      </div>
    </Link>
  );
}

/** Image-led lead story: full-bleed photo with a liquid-glass caption panel */
export function LeadStory({ article }: { article: DBArticle }) {
  return (
    <Link href={articleHref(article)} className="group relative block h-full min-h-[460px] overflow-hidden rounded-[28px] bg-[#0b2a33] md:min-h-[540px]">
      {!article.coverImageUrl && <CoverFallback />}
      {article.coverImageUrl && (
        <Image src={article.coverImageUrl} alt="" fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#06222b]/80 via-[#06222b]/10 to-transparent" />
      <span className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/20 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur-md">
        {rubricLabel(article)}
      </span>
      <div className="absolute inset-x-3 bottom-3 rounded-[22px] border border-white/25 bg-white/[0.12] p-5 text-white shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] backdrop-blur-xl md:inset-x-4 md:bottom-4 md:p-6">
        <div className="text-[13px] font-semibold text-[#9be7f4]">Главное</div>
        <h1 className="mt-1 line-clamp-3 text-[26px] font-bold leading-[1.12] tracking-[-0.02em] [text-wrap:balance] md:text-[34px]">{articleTitle(article)}</h1>
        {article.excerpt && <p className="mt-2 line-clamp-2 hidden text-[15px] leading-relaxed text-white/85 md:block">{article.excerpt}</p>}
        <div className="mt-3 text-[13px] text-white/70">
          {formatDateUTC(articleDate(article), "d MMMM yyyy")}
          {article.source?.name && <> · {article.source.name}</>}
        </div>
      </div>
    </Link>
  );
}

export const ANIMALS: { slug: string; title: string; icon: LucideIcon }[] = [
  { slug: "dogs", title: "Собаки", icon: Dog },
  { slug: "cats", title: "Кошки", icon: Cat },
  { slug: "rodents", title: "Грызуны", icon: Rabbit },
  { slug: "birds", title: "Птицы", icon: Bird },
  { slug: "exotics", title: "Экзоты", icon: Turtle },
];

export const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function DayBadge({ iso, tone }: { iso: string; tone: "glass" | "amber" }) {
  return (
    <div
      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px] ${
        tone === "glass" ? "border border-white/25 bg-white/15 text-white backdrop-blur-md" : "bg-gradient-to-br from-[#ffd57a] to-[#f59e0b] text-[#4a2c02] shadow-[0_8px_18px_-8px_rgba(245,158,11,0.7)]"
      }`}
    >
      <span className="text-lg font-bold leading-none">{Number(iso.slice(8, 10))}</span>
      <span className="text-[10px] font-semibold uppercase">{MONTHS[Number(iso.slice(5, 7)) - 1]}</span>
    </div>
  );
}


export function AnimalStrip({ counts, className = "" }: { counts: Record<string, number>; className?: string }) {
  return (
    <>
        <section aria-label="Животные" className={className}>
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] md:grid md:grid-cols-5 md:overflow-visible">
            {ANIMALS.map(({ slug, title, icon: Icon }) => {
              const count = counts[slug] || 0;
              return (
                <Link key={slug} href={`/category/${slug}`} className={`group flex min-w-[170px] shrink-0 items-center gap-3 rounded-[18px] px-3 py-2.5 transition-transform hover:-translate-y-0.5 ${GLASS}`}>
                  <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[#22c3d6] to-[#0e7490] text-white shadow-[0_10px_24px_-10px_rgba(14,116,144,0.7)] transition-transform group-hover:rotate-[-6deg]">
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
                    <Icon className="relative h-[22px] w-[22px]" strokeWidth={2.1} />
                  </span>
                  <span>
                    <span className="block text-[16px] font-bold leading-tight text-[#0b2a33]">{title}</span>
                    <span className="block whitespace-nowrap text-[12px] text-[#6b8189]">{count ? `${count} ${plural(count, ["материал", "материала", "материалов"])}` : "скоро"}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

    </>
  );
}

export function FreshPanel({ articles, title = "Свежее" }: { articles: DBArticle[]; title?: string }) {
  return (
    <>
            <div className={`${GLASS} p-4 md:p-5`}>
              <div className="mb-1 flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-[#0b2a33]">{title}</h2>
                <Link href="/news" className="text-sm font-semibold text-[#0e7490] hover:underline">
                  Вся лента
                </Link>
              </div>
              {articles.map((article) => (
                <Row key={article.id} article={article} />
              ))}
            </div>
    </>
  );
}

export function SectionTiles({ counts, title = "Разделы" }: { counts: Record<string, number>; title?: string | null }) {
  return (
    <>
        {/* Gradient section tiles with glossy icons */}
        <section>
          {title && <Heading title={title} />}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {TILES.map((tile) => (
              <GradientTile key={tile.href} tile={tile} counts={counts} className="min-h-[188px] last:col-span-2 md:last:col-span-1" />
            ))}
          </div>
        </section>

    </>
  );
}

export function EventsPanel({ events }: { events: EventApiItem[] }) {
  return (
    <>
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#123a63] via-[#0b4553] to-[#0e7490] p-6 text-white">
              <div aria-hidden className="absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-[#a78bfa] opacity-35 blur-3xl" />
              <div className="relative mb-2 flex items-center gap-2 text-lg font-bold">
                <CalendarDays className="h-5 w-5 text-[#9be7f4]" /> Ближайшие события
              </div>
              <div className="relative space-y-1">
                {events.length > 0 ? (
                  events.map((event) => {
                    const inner = (
                      <div className="flex gap-3 rounded-2xl p-2 transition-colors hover:bg-white/10">
                        <DayBadge iso={event.eventDate} tone="glass" />
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-[15px] font-semibold leading-snug">{event.title}</div>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-white/70">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.isOnline ? "Онлайн" : event.location || event.organizer}</span>
                          </div>
                        </div>
                      </div>
                    );
                    return event.linkUrl ? (
                      <a key={event.id} href={event.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
                        {inner}
                      </a>
                    ) : (
                      <div key={event.id}>{inner}</div>
                    );
                  })
                ) : (
                  <p className="py-3 text-sm text-white/70">Скоро добавим новые конференции и вебинары.</p>
                )}
              </div>
            </div>
    </>
  );
}

export function VetDatesPanel({ dates }: { dates: VetDate[] }) {
  return (
    <>
            {dates.length > 0 && (
              <div className={`${GLASS} p-5`}>
                <div className="mb-2 text-lg font-bold text-[#6b4204]">Памятные даты</div>
                <div className="space-y-2">
                  {dates.slice(0, 4).map((date) => (
                    <div key={date.date + date.title} className="flex items-center gap-3">
                      <DayBadge iso={date.date} tone="amber" />
                      <div className="text-sm font-medium leading-snug text-[#3d2a06]">{date.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
    </>
  );
}

export function GuidelinesPanel({ items }: { items: _HomeData["guidelines"] }) {
  return (
    <>
          <div className={`${GLASS} p-6 md:p-8`}>
            <div className="mb-4 flex items-center gap-3">
              <GlossyIcon icon={BookOpen} tone="sand" size="sm" />
              <h2 className="flex-1 text-2xl font-bold tracking-[-0.02em] text-[#0b2a33]">Рекомендации</h2>
              <Link href="/guidelines" className="text-sm font-semibold text-[#0e7490] hover:underline">
                Все
              </Link>
            </div>
            <div className="divide-y divide-[#0b2a33]/10">
              {items.slice(0, 4).map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-3 py-3">
                  <div>
                    <div className="text-[12px] font-semibold text-[#6b8189]">
                      {item.group}
                      {item.year && <> · {item.year}</>}
                    </div>
                    <div className="text-[15px] font-semibold leading-snug text-[#0b2a33] group-hover:text-[#0e7490]">{item.title}</div>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#6b8189]" />
                </a>
              ))}
            </div>
          </div>
    </>
  );
}

export function CalculatorsPanel({ items }: { items: _HomeData["calculators"] }) {
  return (
    <>
          <div className="rounded-[28px] border border-white/80 bg-gradient-to-br from-[#ddf6f8] via-[#d6f1f6] to-[#e0f0ff] p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <GlossyIcon icon={Calculator} tone="teal" size="sm" />
              <h2 className="flex-1 text-2xl font-bold tracking-[-0.02em] text-[#0b2a33]">Калькуляторы</h2>
              <Link href="/calculators" className="text-sm font-semibold text-[#0e7490] hover:underline">
                Все
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {items.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/60 px-4 py-3 backdrop-blur-xl transition-colors hover:bg-white"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#0b2a33]">{item.title}</div>
                    <div className="text-xs text-[#4a6670]">{item.source}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#0e7490]" />
                </a>
              ))}
            </div>
          </div>
    </>
  );
}

export function DiagnosticsPanel({ articles }: { articles: DBArticle[] }) {
  return (
    <>
            {articles.length > 0 && (
              <div className={`${GLASS} mt-6 p-4 md:p-5`}>
                <div className="mb-1 flex items-center justify-between px-2">
                  <h3 className="text-lg font-bold text-[#0b2a33]">Диагностика</h3>
                  <Link href="/category/radiology" className="text-sm font-semibold text-[#0e7490] hover:underline">
                    Все
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4">
                  {articles.slice(0, 4).map((article) => (
                    <Row key={article.id} article={article} />
                  ))}
                </div>
              </div>
            )}
    </>
  );
}

export function NewsletterBand() {
  return (
    <>
        {/* Newsletter: gradient + glass form */}
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0e7490] via-[#2563eb] to-[#5b4fd1] p-8 text-white md:p-12">
          <div aria-hidden className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#5eead4] opacity-40 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 left-10 h-72 w-72 rounded-full bg-[#f0abfc] opacity-30 blur-3xl" />
          <div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.02em] [text-wrap:balance] md:text-[40px] md:leading-[1.1]">Дайджест для ветеринарного врача</h2>
              <p className="mt-3 text-white/85">Раз в неделю — главное по вашим специализациям. Бесплатно.</p>
            </div>
            <div className="rounded-[24px] border border-white/30 bg-white/15 p-2 shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] backdrop-blur-xl md:ml-auto md:w-[420px]">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/register" className="flex-1 rounded-[18px] bg-white px-5 py-3 text-center font-semibold text-[#0b4553] hover:bg-white/90">
                  Зарегистрироваться
                </Link>
                <Link href="/newsletter" className="flex-1 rounded-[18px] px-5 py-3 text-center font-semibold text-white hover:bg-white/10">
                  Только рассылка
                </Link>
              </div>
            </div>
          </div>
        </section>
    </>
  );
}

export function GradientTile({ tile, counts, className = "", size = "md" }: { tile: (typeof TILES)[number]; counts: Record<string, number>; className?: string; size?: "md" | "sm" }) {
  const g = GRADIENTS[tile.tone];
  const count = tile.countKey ? counts[tile.countKey] : undefined;
  const meta = tile.countKey ? (count ? `${count} ${plural(count, ["материал", "материала", "материалов"])}` : "раздел наполняется") : tile.meta;
  return (
    <Link
      href={tile.href}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-br shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset] transition-transform hover:-translate-y-1 ${size === "md" ? "p-5" : "p-4"} ${g.tile} ${className}`}
    >
      <div className="flex items-start justify-between">
        <GlossyIcon icon={tile.icon} tone={tile.tone} size={size} />
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/60 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          <ArrowUpRight className={`h-4 w-4 ${g.ink}`} />
        </span>
      </div>
      <div className={size === "md" ? "mt-6" : "mt-3"}>
        <div className={`${size === "md" ? "text-[18px]" : "text-[16px]"} font-bold leading-tight ${g.ink}`}>{tile.title}</div>
        {size === "md" && <div className={`mt-1 text-[13px] ${g.ink} opacity-75`}>{tile.description}</div>}
        <div className={`mt-2 inline-block rounded-full bg-white/60 px-2.5 py-0.5 text-[11px] font-semibold ${g.ink}`}>{meta}</div>
      </div>
    </Link>
  );
}

/**
 * «Свежая лента» like onco-compass: two columns of numbered headline rows with a
 * thumbnail, rubric, date and source; one link to the full feed below.
 */
export function FeedList({ articles }: { articles: DBArticle[] }) {
  return (
    <div className={`${GLASS} grid grid-cols-1 gap-x-8 px-4 py-2 md:grid-cols-2 md:px-6`}>
      {articles.map((article, i) => (
        <Link
          key={article.id}
          href={articleHref(article)}
          className="group flex items-start gap-4 border-b border-[#0b2a33]/[0.07] py-4 last:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
        >
          <span className="w-6 shrink-0 pt-1 text-right text-[13px] font-semibold tabular-nums text-[#0e7490]/70">{String(i + 1).padStart(2, "0")}</span>
          <div className="relative h-[72px] w-[96px] shrink-0 overflow-hidden rounded-[14px] bg-[#e6eef0]">
            {article.coverImageUrl ? (
              <Image src={article.coverImageUrl} alt="" fill sizes="96px" className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
            ) : (
              <CoverFallback />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[#0e7490]">{rubricLabel(article)}</div>
            <h3 className="mt-0.5 line-clamp-2 text-[16px] font-semibold leading-snug text-[#0b2a33] group-hover:text-[#0e7490]">{articleTitle(article)}</h3>
            <div className="mt-1 text-[12px] text-[#6b8189]">
              {formatDateUTC(articleDate(article), "d MMMM")}
              {article.source?.name && <> · {article.source.name}</>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Clinical cases: 2–3 latest as cards with a lavender «Клинический случай» chip */
export function ClinicalCases({ articles }: { articles: DBArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <section>
      <Heading kicker="Из практики" title="Клинические случаи" href="/category/clinical-cases" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {articles.slice(0, 3).map((article) => (
          <div key={article.id} className={`${GLASS} p-3`}>
            <Card article={article} />
          </div>
        ))}
      </div>
    </section>
  );
}

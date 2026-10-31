import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, ArrowUpRight, BookOpen, Download } from "lucide-react"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { JournalReader } from "@/components/journal/journal-reader"
import { GLASS } from "@/components/glass/kit"
import { getPublishedJournalIssueBySlug, JOURNAL, JOURNAL_ISSUE_CONTENTS, journalPageUrl } from "@/lib/magazine"
import { formatDateUTC } from "@/lib/utils/date"

export const dynamic = "force-dynamic"
export const revalidate = 60

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://con-vet.ru"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const issue = await getPublishedJournalIssueBySlug(slug)
  if (!issue) return { title: "Журнал" }
  const contents = JOURNAL_ISSUE_CONTENTS[slug]
  const description = contents?.lead || issue.description || JOURNAL.tagline
  return {
    title: issue.title,
    description,
    openGraph: {
      title: issue.title,
      description,
      url: `${SITE_URL}/journal/${slug}`,
      siteName: "CON-VET.ru",
      locale: "ru_RU",
      type: "article",
      images: issue.coverImageUrl.startsWith("http") ? [{ url: issue.coverImageUrl, alt: issue.coverAlt || issue.title }] : undefined,
    },
    alternates: { canonical: `${SITE_URL}/journal/${slug}` },
  }
}

export default async function JournalIssuePage({ params }: Props) {
  const { slug } = await params
  const issue = await getPublishedJournalIssueBySlug(slug)
  if (!issue) notFound()

  const contents = JOURNAL_ISSUE_CONTENTS[slug]
  const pages = contents ? Array.from({ length: contents.pageCount }, (_, i) => journalPageUrl(issue.coverImageUrl, i + 1)) : []
  const thumbs = pages.map((_, i) => journalPageUrl(issue.coverImageUrl, i + 1, true))
  const toc = contents ? [...contents.toc].sort((a, b) => a.page - b.page) : []
  const released = formatDateUTC(issue.publicationDate, "d MMMM yyyy")

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Журнал", href: "/journal" }, { label: `№ ${issue.issueNumber || issue.title}` }]} className="mb-6" />

      {/* Issue hero: the cover as a printed object on the deep teal of the magazine */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b2a33] via-[#0b3f4c] to-[#123a63] text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#22c3d6] opacity-20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-[#8b7bff] opacity-20 blur-3xl" />
        <div className="relative grid grid-cols-1 items-center gap-8 p-6 sm:p-10 md:grid-cols-[minmax(0,320px)_1fr] md:gap-12 lg:p-14">
          <a href={pages.length ? "#page-1" : issue.pdfUrl || "#"} className="group mx-auto w-52 sm:w-64 md:w-full">
            <div className="relative overflow-hidden rounded-[6px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.75)] ring-1 ring-white/10 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-0.6deg]">
              <Image src={issue.coverImageUrl} alt={issue.coverAlt || issue.title} width={1200} height={1697} sizes="(max-width: 768px) 256px, 320px" priority className="h-auto w-full" />
              {/* spine highlight */}
              <span aria-hidden className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-white/15 to-transparent" />
            </div>
          </a>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
              <span className="rounded-full bg-white/12 px-3 py-1 text-[#9ff3ff] ring-1 ring-white/15">№ {issue.issueNumber}</span>
              <span className="rounded-full px-3 py-1 text-white/70 ring-1 ring-white/15">Вышел {released}</span>
              {contents && <span className="rounded-full px-3 py-1 text-white/70 ring-1 ring-white/15">{contents.pageCount} страницы</span>}
            </div>
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#9ff3ff]">{JOURNAL.tagline}</p>
            <h1 className="text-[40px] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-[56px] lg:text-[68px] [text-wrap:balance]">{JOURNAL.name}</h1>
            {(contents?.lead || issue.description) && (
              <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-white/75 md:text-[17px]">{contents?.lead || issue.description}</p>
            )}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {pages.length > 0 && (
                <a href="#page-1" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[#0b2a33] shadow-lg shadow-black/20 transition hover:bg-[#e0f7fa]">
                  <BookOpen className="h-4 w-4" /> Читать онлайн
                </a>
              )}
              {issue.pdfUrl && (
                <a href={issue.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10">
                  <Download className="h-4 w-4" /> Скачать PDF{contents ? ` · ${contents.pdfSizeMb.toLocaleString("ru-RU")} МБ` : ""}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {toc.length > 0 && (
        <section className="mt-12 md:mt-16" aria-labelledby="toc">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 id="toc" className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#0b2a33] md:text-[32px]">В номере</h2>
            <span className="hidden text-[13px] text-muted-foreground sm:inline">Нажмите на материал, чтобы открыть страницу</span>
          </div>
          <ol className={`${GLASS} divide-y divide-[#0b2a33]/[0.07] overflow-hidden`}>
            {toc.map((item) => (
              <li key={`${item.page}-${item.title}`} className="group relative flex items-start gap-4 px-5 py-4 transition hover:bg-white/60 sm:gap-6 sm:px-7">
                <span className="w-10 shrink-0 pt-0.5 text-right text-[22px] font-bold leading-none tabular-nums text-[#0e7490] sm:w-12 sm:text-[26px]">{item.page}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0e7490]/80">{item.rubric}</div>
                  <a href={`#page-${item.page}`} className="text-[16px] font-semibold leading-snug text-[#0b2a33] [text-wrap:pretty] after:absolute after:inset-0 sm:text-[17px]">
                    {item.title}
                  </a>
                </div>
                {item.articleSlug && (
                  <Link
                    href={`/news/${item.articleSlug}`}
                    className="relative z-10 mt-0.5 hidden shrink-0 items-center gap-1 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-[#0b2a33] hover:bg-white sm:inline-flex"
                  >
                    На сайте <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {pages.length > 0 && (
        <section className="mt-12 md:mt-16" aria-label="Чтение онлайн">
          <h2 className="mb-5 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#0b2a33] md:text-[32px]">Читать онлайн</h2>
          <JournalReader pages={pages} thumbs={thumbs} title={issue.title} />
        </section>
      )}

      <section className="mt-12 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-[1fr_auto] md:items-end">
        <div className="text-[13px] leading-relaxed text-muted-foreground">
          <div className="mb-1 font-semibold text-[#0b2a33]">Выходные данные</div>
          {JOURNAL.imprint.map((line) => <p key={line}>{line}</p>)}
        </div>
        <Link href="/journal" className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/80 bg-white/70 px-5 py-2.5 text-[14px] font-semibold text-[#0b2a33] backdrop-blur-xl hover:bg-white md:self-auto">
          Все номера <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  )
}

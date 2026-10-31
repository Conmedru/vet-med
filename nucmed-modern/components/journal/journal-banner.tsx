import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { JournalIssueApiItem } from "@/lib/schemas/journal"
import { JOURNAL, JOURNAL_ISSUE_CONTENTS } from "@/lib/magazine/issues"
import { formatDateUTC } from "@/lib/utils/date"

/** Home page: the latest issue of «Ветеринарный консилиум» — cover, what is inside, link to the issue */
export function JournalBanner({ issue, archiveLink = true }: { issue: JournalIssueApiItem; archiveLink?: boolean }) {
  const href = `/journal/${issue.slug}`
  const highlights = (JOURNAL_ISSUE_CONTENTS[issue.slug]?.toc ?? [])
    .filter((item) => !["Новости", "События", "Календарь ветеринара"].includes(item.rubric))
    .slice(0, 4)

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b2a33] via-[#0b3f4c] to-[#123a63] text-white">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#22c3d6] opacity-20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#8b7bff] opacity-20 blur-3xl" />

      <div className="relative grid grid-cols-1 items-center gap-7 p-6 sm:p-9 md:grid-cols-[200px_1fr] md:gap-10 lg:grid-cols-[220px_1fr_minmax(0,360px)] lg:p-11">
        <Link href={href} className="group mx-auto w-40 sm:w-48 md:w-full" aria-label={`${issue.title}: открыть номер`}>
          <div className="relative overflow-hidden rounded-[5px] shadow-[0_32px_64px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10 transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-[-1deg]">
            <Image src={issue.coverImageUrl} alt={issue.coverAlt || issue.title} width={1200} height={1697} sizes="220px" className="h-auto w-full" />
            <span aria-hidden className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/25 via-white/15 to-transparent" />
          </div>
        </Link>

        <div className="min-w-0 text-center md:text-left">
          <div className="mb-3 flex flex-wrap justify-center gap-2 text-[12px] font-semibold md:justify-start">
            <span className="rounded-full bg-white/12 px-3 py-1 text-[#9ff3ff] ring-1 ring-white/15">Новый номер</span>
            <span className="rounded-full px-3 py-1 text-white/70 ring-1 ring-white/15">
              № {issue.issueNumber} · {formatDateUTC(issue.publicationDate, "d MMMM yyyy")}
            </span>
          </div>
          <h2 className="text-[34px] font-extrabold leading-[1] tracking-[-0.03em] sm:text-[44px] [text-wrap:balance]">{JOURNAL.name}</h2>
          <p className="mt-2 text-[15px] text-white/70">{JOURNAL.tagline} · бесплатно, онлайн и в PDF</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row md:items-start">
            <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[#0b2a33] shadow-lg shadow-black/20 transition hover:bg-[#e0f7fa]">
              Читать номер <ArrowRight className="h-4 w-4" />
            </Link>
            {archiveLink && <Link href="/journal" className="inline-flex items-center rounded-full px-5 py-3 text-[14px] font-semibold text-white/85 ring-1 ring-white/25 transition hover:bg-white/10">
              Все номера
            </Link>}
          </div>
        </div>

        {highlights.length > 0 && (
          <ul className="hidden divide-y divide-white/10 border-l border-white/10 pl-8 lg:block">
            {highlights.map((item) => (
              <li key={item.page}>
                <Link href={`${href}#page-${item.page}`} className="group block py-3 first:pt-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9ff3ff]/80">{item.rubric} · с. {item.page}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[15px] font-semibold leading-snug text-white/90 group-hover:text-white">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

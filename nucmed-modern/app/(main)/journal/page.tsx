import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { JournalBanner } from "@/components/journal"
import { GLASS } from "@/components/glass/kit"
import { JOURNAL, listPublishedJournalIssues } from "@/lib/magazine"
import { formatDateUTC } from "@/lib/utils/date"

export const dynamic = "force-dynamic"
export const revalidate = 60

export const metadata: Metadata = {
  title: `Журнал «${JOURNAL.name}»`,
  description: `${JOURNAL.tagline}. Номера журнала онлайн и в PDF: гайдлайны, клинические разборы, исследования, шпаргалки.`,
}

export default async function JournalPage() {
  let issues: Awaited<ReturnType<typeof listPublishedJournalIssues>> = []
  try {
    issues = await listPublishedJournalIssues()
  } catch (error) {
    console.error("[JournalPage] Failed to fetch issues:", error)
  }
  const [latest, ...archive] = issues

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Журнал" }]} className="mb-6" />

      <div className="mb-8 max-w-3xl">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0e7490]">{JOURNAL.tagline}</p>
        <h1 className="text-[36px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#0b2a33] md:text-[52px]">«{JOURNAL.name}»</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          Журнал CON-VET.ru: гайдлайны, клинические разборы, исследования и шпаргалки для практикующих ветеринаров. Читайте номера онлайн или скачивайте в PDF — бесплатно.
        </p>
      </div>

      {!latest ? (
        <div className={`${GLASS} p-10 text-center`}>
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="text-stone-600">Первый номер скоро появится</p>
        </div>
      ) : (
        <JournalBanner issue={latest} archiveLink={false} />
      )}

      {archive.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 text-[26px] font-bold tracking-[-0.02em] text-[#0b2a33] md:text-[32px]">Архив номеров</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {archive.map((issue) => (
              <Link key={issue.id} href={`/journal/${issue.slug}`} className="group">
                <div className="overflow-hidden rounded-[5px] shadow-[0_20px_40px_-18px_rgba(11,42,51,0.5)] transition-transform duration-300 group-hover:-translate-y-1">
                  <Image src={issue.coverImageUrl} alt={issue.coverAlt || issue.title} width={1200} height={1697} sizes="220px" className="h-auto w-full" />
                </div>
                <div className="mt-3 text-[15px] font-semibold text-[#0b2a33]">№ {issue.issueNumber || issue.title}</div>
                <div className="text-[13px] text-muted-foreground">{formatDateUTC(issue.publicationDate, "LLLL yyyy")}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 text-[13px] leading-relaxed text-muted-foreground">
        {JOURNAL.imprint.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  )
}

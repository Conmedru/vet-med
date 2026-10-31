import Link from "next/link"
import { jsonLd } from "@/lib/utils/safe-html"
import Script from "next/script"
import { SponsoredPostCard } from "@/components/articles"
import { EventsCalendar } from "@/components/events/events-calendar"
import { PersonalFeedSection } from "@/components/home/personal-feed-section"
import { JournalBanner } from "@/components/journal"
import {
  AnimalStrip,
  ClinicalCases,
  FeedList,
  CalculatorsPanel,
  EventsPanel,
  GuidelinesPanel,
  Heading,
  NewsletterBand,
  SectionTiles,
} from "@/components/glass/kit"
import { Rail, SplitFeature } from "@/components/glass/magazine"
import { FEATURES } from "@/lib/config"
import { getCurrentMonthKey, listEventsByMonth } from "@/lib/events"
import { loadHomeData } from "@/lib/home-data"
import { getLatestJournalIssueForBanner } from "@/lib/magazine"
import { getActiveSponsoredPosts } from "@/lib/sponsored"
import { getVetDatesForMonth } from "@/lib/vet-dates"

export const dynamic = "force-dynamic"
export const revalidate = 60

/**
 * Home, «Журнал» layout. Pets only (client, 2026-10-29: farm animals only in their own
 * section): lead feature, animal navigation, pets feed, clinical cases, a second feature
 * with upcoming events, sections, diagnostics rail, the month calendar and references.
 */
export default async function Home() {
  const currentEventsMonth = getCurrentMonthKey()
  const results = await Promise.allSettled([
    loadHomeData(),
    getActiveSponsoredPosts(),
    FEATURES.PUBLIC_JOURNAL ? getLatestJournalIssueForBanner() : Promise.resolve(null),
    listEventsByMonth(currentEventsMonth),
  ])

  const names = ["loadHomeData", "getActiveSponsoredPosts", "getLatestJournalIssueForBanner", "listEventsByMonth"]
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[Home] ${names[i]} FAILED:`, r.reason)
  })

  const data = results[0].status === "fulfilled" ? results[0].value : null
  const sponsoredPosts = results[1].status === "fulfilled" ? results[1].value : []
  const latestJournalIssue = results[2].status === "fulfilled" ? results[2].value : null
  const eventsMonth =
    results[3].status === "fulfilled"
      ? results[3].value
      : { month: currentEventsMonth, events: [], vetDates: getVetDatesForMonth(currentEventsMonth) }

  if (!data) {
    return (
      <div className="container py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold">CON-VET.ru</h1>
        <p className="mb-8 text-muted-foreground">Пока нет опубликованных статей</p>
        <Link href="/admin" className="text-primary hover:underline">
          Перейти в админку
        </Link>
      </div>
    )
  }

  const { featured, articles, counts } = data
  const rest = articles.filter((a) => a.id !== featured.id)
  const caseIds = new Set(data.clinicalCases.map((a) => a.id))
  const second = data.specialties.find((a) => a.id !== featured.id && !caseIds.has(a.id)) || rest[0]
  // Not more than 3 articles of one source in the feed: Frontiers publishes the most and
  // made the home page look like a single-source site (client, 2026-10-29)
  const perSource = new Map<string, number>()
  const feed = rest
    .filter((a) => a.id !== second?.id && !caseIds.has(a.id))
    .filter((a) => {
      const key = a.source?.slug ?? "manual"
      const n = perSource.get(key) ?? 0
      perSource.set(key, n + 1)
      return n < 3
    })
    .slice(0, 10)
  const sponsored = sponsoredPosts[0]

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://con-vet.ru"
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CON-VET.ru",
    url: SITE_URL,
    description: "Портал ветеринарной медицины: новости, исследования и клинические случаи.",
    sameAs: [],
  }
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CON-VET.ru",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <>
      <Script id="organization-json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationJsonLd) }} />
      <Script id="website-json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd) }} />

      <div className="container space-y-14 py-6 md:py-8">
        <div className="space-y-5">
          <SplitFeature article={featured} tone="teal" kicker="Главное" />
          <AnimalStrip counts={counts} />
        </div>

        {/* Pets feed (client: like onco-compass, latest articles about all pets) */}
        <section>
          <Heading kicker="Кошки, собаки, грызуны, птицы, экзоты" title="Свежее о питомцах" href="/category/pets" />
          <FeedList articles={feed} />
          {sponsored && (
            <div className="mt-4 rounded-[24px] border border-white/80 bg-white/60 px-4 backdrop-blur-xl md:px-6">
              <SponsoredPostCard post={sponsored} variant="row" />
            </div>
          )}
          <div className="mt-5 flex justify-center">
            <Link href="/category/pets" className="rounded-xl border border-white/80 bg-white/70 px-5 py-2.5 text-[14px] font-semibold text-foreground backdrop-blur-xl hover:bg-white">
              Открыть полную ленту
            </Link>
          </div>
        </section>

        {FEATURES.PUBLIC_JOURNAL && latestJournalIssue && <JournalBanner issue={latestJournalIssue} />}

        <ClinicalCases articles={data.clinicalCases} />

        {second && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <SplitFeature article={second} tone="lavender" kicker="Разбор" reverse compact />
            </div>
            <aside className="lg:col-span-4">
              <EventsPanel events={data.events.slice(0, 3)} />
            </aside>
          </section>
        )}

        <PersonalFeedSection />

        <SectionTiles counts={counts} title="Разделы и сервисы" />

        <Rail title="Диагностика" href="/category/diagnostics" articles={data.diagnostics} />

        <section>
          <EventsCalendar initialMonth={eventsMonth.month} initialEvents={eventsMonth.events} initialVetDates={eventsMonth.vetDates} />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GuidelinesPanel items={data.guidelines} />
          <CalculatorsPanel items={data.calculators} />
        </section>

        <NewsletterBand />
      </div>
    </>
  )
}

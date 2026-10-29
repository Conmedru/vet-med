import Link from "next/link"
import Script from "next/script"
import { SponsoredPostCard } from "@/components/articles"
import { EventsCalendar } from "@/components/events/events-calendar"
import { PersonalFeedSection } from "@/components/home/personal-feed-section"
import { JournalBanner } from "@/components/journal"
import {
  AnimalStrip,
  CalculatorsPanel,
  EventsPanel,
  GLASS,
  GuidelinesPanel,
  Heading,
  NewsletterBand,
  Row,
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
 * Home, «Журнал» layout: lead split feature, animal navigation, full-bleed topic rails,
 * a second feature with upcoming events, sections, the month calendar and references.
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
  const second = data.specialties.find((a) => a.id !== featured.id) || rest[0]
  const latest = rest.filter((a) => a.id !== second?.id).slice(0, 8)
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
      <Script id="organization-json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <Script id="website-json-ld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />

      <div className="container space-y-14 py-6 md:py-8">
        {FEATURES.PUBLIC_JOURNAL && latestJournalIssue && <JournalBanner issue={latestJournalIssue} />}

        <div className="space-y-5">
          <SplitFeature article={featured} tone="teal" kicker="Главное" />
          <AnimalStrip counts={counts} />
        </div>

        <Rail kicker="Животные" title="Собаки, кошки и другие питомцы" href="/category/pets" articles={data.pets} />

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

        <Rail kicker="Специализации" title="Онкология, неврология, кардиология" href="/category/oncology" articles={data.specialties} />

        <PersonalFeedSection />

        <SectionTiles counts={counts} title="Разделы и сервисы" />

        <Rail kicker="Диагностика" title="УЗИ, рентген, лаборатория" href="/category/radiology" articles={data.diagnostics} />

        <section>
          <Heading title="Последние новости" href="/news" />
          <div className={`${GLASS} grid grid-cols-1 gap-x-4 p-3 md:grid-cols-2 md:p-4`}>
            {latest.map((article) => (
              <Row key={article.id} article={article} />
            ))}
          </div>
          {sponsored && (
            <div className={`${GLASS} mt-4 px-4 md:px-6`}>
              <SponsoredPostCard post={sponsored} variant="row" />
            </div>
          )}
        </section>

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

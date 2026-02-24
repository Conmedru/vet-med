import Link from "next/link"
import { TrendingUp } from "lucide-react"
import { DBArticleCard, DBArticleSidebar, LatestNews } from "@/components/articles"
import { FadeIn } from "@/components/ui/fade-in"
import { getPublishedArticles, getFeaturedArticles, getArticleStats, getTrendingTags } from "@/lib/articles"
import { getActiveSponsoredPosts } from "@/lib/sponsored"
import { getLatestJournalIssueForBanner } from "@/lib/magazine"
import { NewsletterForm, ExpandableTrends } from "@/components/shared"
import { JournalBanner } from "@/components/journal"

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function Home() {
  const results = await Promise.allSettled([
    getPublishedArticles(20),
    getFeaturedArticles(5),
    getArticleStats(),
    getTrendingTags(8),
    getActiveSponsoredPosts(),
    getLatestJournalIssueForBanner(),
  ]);

  const articles = results[0].status === 'fulfilled' ? results[0].value : [];
  const featured = results[1].status === 'fulfilled' ? results[1].value : [];
  const stats = results[2].status === 'fulfilled' ? results[2].value : { total: 0, thisWeek: 0, thisMonth: 0, categories: [] };
  const trendingTags = results[3].status === 'fulfilled' ? results[3].value : [];
  const sponsoredPosts = results[4].status === 'fulfilled' ? results[4].value : [];
  const latestJournalIssue = results[5].status === 'fulfilled' ? results[5].value : null;

  // Log any failures for debugging
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const names = ['getPublishedArticles', 'getFeaturedArticles', 'getArticleStats', 'getTrendingTags', 'getActiveSponsoredPosts', 'getLatestJournalIssueForBanner'];
      console.error(`[Home] ${names[i]} FAILED:`, r.reason);
    }
  });

  // If no articles, show empty state
  if (articles.length === 0) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl font-serif font-bold mb-4">VetMed</h1>
        <p className="text-muted-foreground mb-8">Пока нет опубликованных статей</p>
        <Link href="/admin" className="text-primary hover:underline">
          Перейти в админку
        </Link>
      </div>
    );
  }

  // Main content data
  const featuredArticle = featured[0] || articles[0];
  const trendingArticles = articles.slice(0, 3);

  // Latest news - exclude featured article, take 10
  const latestNews = articles
    .filter((a: typeof articles[0]) => a.id !== featuredArticle.id)
    .slice(0, 10);

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vetmed.ru";

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VetMed",
    url: SITE_URL,
    description: "Ведущий портал ветеринарной медицины с новостями, исследованиями и клиническими случаями.",
    sameAs: [],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "VetMed",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
    <div className="container py-8 md:py-12" suppressHydrationWarning>
      {/* Full-width Journal Banner */}
      {latestJournalIssue && (
        <div className="mb-10">
          <JournalBanner issue={latestJournalIssue} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10" suppressHydrationWarning>

        {/* LEFT COLUMN: Text-only Sidebar (Sticky) */}
        <aside className="lg:col-span-3 hidden lg:block">
          <div className="sticky top-24 h-[calc(100vh-8rem)] overflow-hidden">
            <FadeIn delay={0.1}>
              <DBArticleSidebar articles={articles} />
            </FadeIn>
          </div>
        </aside>

        {/* RIGHT COLUMN: Main Content */}
        <div className="lg:col-span-9 flex flex-col gap-12">

          {/* Hero Section: Featured + Sub-featured Grid */}
          <section>
            <FadeIn className="mb-8">
              <h1 className="text-4xl font-serif font-bold tracking-tight lg:text-5xl mb-4">
                Главное сегодня
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Актуальные новости ветеринарной медицины, исследования и клинические случаи.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Main Hero Article - takes 8 columns on md */}
              <div className="md:col-span-8">
                <FadeIn>
                  <DBArticleCard article={featuredArticle} />
                </FadeIn>
              </div>

              {/* Right Rail */}
              <div className="md:col-span-4 space-y-3">

                {/* Популярное + Тренды + Статистика — single card */}
                <aside className="rounded-xl border border-stone-200/60 bg-white p-4 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Популярное</span>
                  </div>

                  {trendingArticles.map((article: typeof articles[0], idx: number) => (
                    <FadeIn key={article.id} delay={0.2 + (idx * 0.1)}>
                      <DBArticleCard article={article} variant="compact" />
                    </FadeIn>
                  ))}

                  {trendingTags.length > 0 && (
                    <>
                      <div className="border-t border-stone-100 pt-3" suppressHydrationWarning>
                        <ExpandableTrends tags={trendingTags} initialCount={3} />
                      </div>
                    </>
                  )}

                  <div className="border-t border-stone-100 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xl font-serif font-bold text-primary">{stats.thisWeek}</div>
                        <div className="text-[10px] text-muted-foreground">за неделю</div>
                      </div>
                      <div>
                        <div className="text-xl font-serif font-bold text-primary">{stats.thisMonth}</div>
                        <div className="text-[10px] text-muted-foreground">за месяц</div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          {/* Latest News Section */}
          <LatestNews articles={latestNews} sponsoredPosts={sponsoredPosts} maxArticles={10} />

          {/* Newsletter Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-primary text-primary-foreground p-8 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-serif font-bold mb-4">Подпишитесь на дайджест</h2>
              <p className="text-primary-foreground/80 mb-6 text-lg">
                Получайте лучшие материалы по ветеринарии каждую неделю. Без спама.
              </p>
              <div className="bg-background rounded-lg p-1.5 max-w-md">
                <NewsletterForm />
              </div>
            </div>
            <div className="relative z-10 hidden md:block">
              {/* Abstract visual decoration */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/20 blur-3xl rounded-full" />
              <div className="relative grid grid-cols-2 gap-4 opacity-80">
                <div className="h-24 bg-white/10 rounded-lg animate-pulse" />
                <div className="h-32 bg-white/10 rounded-lg animate-pulse delay-100" />
                <div className="h-32 bg-white/10 rounded-lg animate-pulse delay-200" />
                <div className="h-24 bg-white/10 rounded-lg animate-pulse delay-300" />
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Mobile visible sidebar (at bottom) */}
      <div className="mt-12 lg:hidden">
        <h3 className="font-bold text-xl mb-6 border-b pb-2">Все новости</h3>
        <DBArticleSidebar articles={articles} className="h-[500px]" />
      </div>
    </div>
    </>
  )
}

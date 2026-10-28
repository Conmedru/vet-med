import { notFound, permanentRedirect } from "next/navigation"
import { getRubric, LEGACY_RUBRIC_REDIRECTS, PET_SLUGS, RUBRIC_KIND_LABELS } from "@/lib/rubrics"
import { getPublishedArticles, getArticlesByRubrics } from "@/lib/articles"
import { getGuidelinesByRubric } from "@/lib/guidelines"
import { DBArticleCard, DBArticleSidebar } from "@/components/articles"
import { CategorySubscribeButton } from "@/components/shared"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in"
import { BookOpen, ExternalLink, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{
    slug: string
  }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vetmed.ru";

const ALL_DESCRIPTION = "Полный архив новостей, исследований и клинических случаев ветеринарной медицины."

/** Rubric page: a rubric from lib/rubrics, the "pets" group or the full archive */
function resolvePage(slug: string) {
  if (slug === "all") {
    return { title: "Все материалы", badge: "Архив", description: ALL_DESCRIPTION, rubricSlugs: null }
  }
  if (slug === "pets") {
    return { title: "Питомцы", badge: "Животные", description: "Кошки, собаки, грызуны и декоративные птицы.", rubricSlugs: PET_SLUGS }
  }
  const rubric = getRubric(slug)
  if (!rubric) return null
  return { title: rubric.name, badge: RUBRIC_KIND_LABELS[rubric.kind], description: rubric.description, rubricSlugs: [rubric.slug] }
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params
  
  const page = resolvePage(slug)
  const title = page?.title || "Категория"
  const description = slug === "all"
    ? ALL_DESCRIPTION
    : `${page?.description || ""} Статьи и новости в рубрике «${title}».`.trim();
  
  return {
    title: `${title} | VetMed`,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/category/${slug}`,
      siteName: "VetMed",
      locale: "ru_RU",
      type: "website",
    },
    alternates: {
      canonical: `${SITE_URL}/category/${slug}`,
    },
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  
  const page = resolvePage(slug)

  if (!page) {
    const target = LEGACY_RUBRIC_REDIRECTS[slug]
    if (target) permanentRedirect(`/category/${target}`)
    notFound()
  }

  const displayTitle = page.title

  const [sidebarArticles, filteredArticles] = await Promise.all([
    getPublishedArticles(15),
    page.rubricSlugs
      ? getArticlesByRubrics(page.rubricSlugs, 50)
      : getPublishedArticles(50),
  ])
  const allArticles = sidebarArticles
  const guidelines = page.rubricSlugs ? getGuidelinesByRubric(page.rubricSlugs) : []

  return (
    <div className="container py-8 md:py-12 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: Global Sidebar (Sticky) */}
        <aside className="lg:col-span-3 hidden lg:block">
          <div className="sticky top-36 h-[calc(100vh-11rem)] overflow-hidden">
            <FadeIn delay={0.1}>
              <DBArticleSidebar articles={allArticles} />
            </FadeIn>
          </div>
        </aside>

        {/* MAIN CONTENT: Category Articles */}
        <div className="lg:col-span-9 flex flex-col gap-8">
          <Breadcrumbs 
            items={[
              { label: "Новости", href: "/news" },
              { label: displayTitle }
            ]}
          />
          <FadeIn className="flex flex-col gap-4 border-b pb-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <Badge variant="outline" className="text-primary border-primary/20">
                     {page.badge}
                   </Badge>
                   <span className="text-sm text-muted-foreground">{filteredArticles.length} статей</span>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight capitalize">
                    {displayTitle}
                  </h1>
                  {slug !== "all" && (
                    <CategorySubscribeButton category={displayTitle} />
                  )}
                </div>
                <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
                  {page.description}
                </p>
              </div>
            </div>
          </FadeIn>

          {guidelines.length > 0 && (
            <FadeIn delay={0.15} className="bg-muted/30 p-5 rounded-xl border">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 font-bold">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2>Гайдлайны по теме</h2>
                </div>
                <Link href={page.rubricSlugs!.length === 1 ? `/guidelines?rubric=${page.rubricSlugs![0]}` : "/guidelines"} className="text-sm text-primary hover:underline whitespace-nowrap">
                  Все гайдлайны →
                </Link>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {guidelines.slice(0, 6).map((g) => (
                  <li key={g.url}>
                    <a href={g.url} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary transition-colors">
                      {g.title}
                      {g.language === "ru" && <span className="ml-1.5 text-xs text-primary">рус.</span>}
                      <ExternalLink className="inline h-3 w-3 ml-1 -mt-0.5 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </FadeIn>
          )}

          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Featured in Category (First item larger) */}
               <div className="lg:col-span-8">
                  <StaggerContainer className="flex flex-col gap-8">
                    {filteredArticles.map((article, index) => (
                      <StaggerItem key={article.id}>
                        {index === 0 ? (
                           <DBArticleCard article={article} />
                        ) : (
                           <DBArticleCard article={article} variant="horizontal" />
                        )}
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
               </div>
               
               {/* Right sidebar for category specific or trending in category */}
               <div className="lg:col-span-4 hidden lg:flex flex-col gap-6">
                  <FadeIn delay={0.3} className="bg-muted/30 p-6 rounded-xl border">
                    <div className="flex items-center gap-2 mb-4 font-bold">
                       <TrendingUp className="h-4 w-4 text-primary" />
                       <h3>Популярное в рубрике</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                       {filteredArticles
                         .slice(0, 3)
                         .map(article => (
                           <Link key={article.id} href={`/news/${article.slug || article.id}`} className="group">
                             <h4 className="font-medium text-sm leading-snug group-hover:text-primary transition-colors mb-1">
                               {article.title || article.titleOriginal}
                             </h4>
                             <span className="text-xs text-muted-foreground flex items-center gap-1">
                               {article.category || "Новости"}
                             </span>
                           </Link>
                         ))
                       }
                    </div>
                  </FadeIn>
               </div>
            </div>
          ) : (
            <FadeIn delay={0.2} className="py-20 text-center bg-muted/20 rounded-xl border border-dashed">
              <h3 className="text-xl font-semibold mb-2">В этой категории пока нет материалов</h3>
              <p className="text-muted-foreground mb-6">Мы работаем над новыми статьями. Загляните позже!</p>
              <Button asChild>
                <Link href="/">Вернуться на главную</Link>
              </Button>
            </FadeIn>
          )}
        </div>
        
        {/* Mobile visible sidebar (at bottom) */}
        <div className="mt-12 lg:hidden">
          <h3 className="font-bold text-xl mb-6 border-b pb-2">Все новости</h3>
          <DBArticleSidebar articles={allArticles} className="h-[500px]" />
        </div>
      </div>
    </div>
  )
}

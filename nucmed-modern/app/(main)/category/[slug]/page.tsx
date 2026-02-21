import { notFound } from "next/navigation"
import { getCategoryBySlug, isSpecialSection, isAnimalCategory } from "@/lib/data"
import { getPublishedArticles, getArticlesByCategory } from "@/lib/articles"
import { DBArticleCard, DBArticleSidebar } from "@/components/articles"
import { CategorySubscribeButton } from "@/components/shared"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { Button } from "@/components/ui/button"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in"
import { TrendingUp } from "lucide-react"
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

export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params
  
  const categoryName = getCategoryBySlug(slug)
  const title = slug === "all" ? "Все материалы" : categoryName || "Категория"
  const description = slug === "all"
    ? "Полный архив новостей, исследований и клинических случаев ветеринарной медицины."
    : `Статьи и новости в категории «${title}»: последние исследования, клинические случаи и обзоры.`;
  
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
  
  // Find category by transliterated slug
  const categoryName = getCategoryBySlug(slug)

  if (!categoryName && slug !== "all") {
    notFound()
  }

  const displayTitle = slug === "all" ? "Все материалы" : categoryName

  const [sidebarArticles, filteredArticles] = await Promise.all([
    getPublishedArticles(15),
    slug === "all"
      ? getPublishedArticles(50)
      : getArticlesByCategory(categoryName || slug, 50),
  ])
  const allArticles = sidebarArticles

  return (
    <div className="container py-8 md:py-12 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: Global Sidebar (Sticky) */}
        <aside className="lg:col-span-3 hidden lg:block">
          <div className="sticky top-24 h-[calc(100vh-8rem)] overflow-hidden">
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
              { label: displayTitle || "Категория" }
            ]}
          />
          <FadeIn className="flex flex-col gap-4 border-b pb-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <Badge variant="outline" className="text-primary border-primary/20">
                     {slug === "all" ? "Архив" : (categoryName && isAnimalCategory(categoryName) ? "Животные" : categoryName && isSpecialSection(categoryName) ? "Спецраздел" : "Специальность")}
                   </Badge>
                   <span className="text-sm text-muted-foreground">{filteredArticles.length} статей</span>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight capitalize">
                    {displayTitle}
                  </h1>
                  {slug !== "all" && categoryName && (
                    <CategorySubscribeButton category={categoryName} />
                  )}
                </div>
                <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
                  {slug === "all" 
                    ? "Полный архив новостей, исследований и клинических случаев в области ветеринарной медицины."
                    : `Подборка актуальных материалов, исследований и новостей в категории «${displayTitle}».`
                  }
                </p>
              </div>
            </div>
          </FadeIn>

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

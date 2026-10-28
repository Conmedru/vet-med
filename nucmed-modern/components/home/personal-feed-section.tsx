"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowRight, Loader2, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DBArticleCard } from "@/components/articles"
import type { DBArticle } from "@/lib/articles"
import { useMemberSession } from "@/lib/hooks/use-member-session"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * «Моя лента» на главной: для вошедших — материалы по их рубрикам, для гостей —
 * приглашение зарегистрироваться и настроить ленту (ТЗ клиента, п. 13–14).
 * Клиентский компонент: главная не зависит от cookie сессии.
 */
export function PersonalFeedSection() {
  const { member, isLoading: sessionLoading } = useMemberSession()
  const { data, isLoading: feedLoading } = useSWR<{ articles: DBArticle[]; personalized: boolean }>(
    member ? "/api/member/feed?limit=4" : null,
    fetcher
  )

  if (sessionLoading) return null

  if (!member) {
    return (
      <section className="rounded-2xl border bg-primary/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
        <div className="rounded-xl bg-primary/10 p-3 w-fit">
          <SlidersHorizontal className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Соберите ленту под себя</h2>
          <p className="text-muted-foreground mt-1">
            Зарегистрируйтесь бесплатно: выберите животных, специализации и методы диагностики — и получайте только
            нужные вам материалы, а по понедельникам — дайджест недели.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button asChild>
            <Link href="/register">Зарегистрироваться</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Войти</Link>
          </Button>
        </div>
      </section>
    )
  }

  const articles = data?.articles ?? []

  return (
    <section>
      <div className="flex items-center justify-between gap-4 border-b pb-3 mb-6">
        <h2 className="text-2xl font-bold">Моя лента</h2>
        <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          {data?.personalized ? "Вся лента" : "Настроить ленту"} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {feedLoading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : articles.length === 0 ? (
        <p className="text-muted-foreground">
          По выбранным рубрикам пока нет материалов.{" "}
          <Link href="/account" className="text-primary hover:underline">
            Изменить рубрики
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <DBArticleCard key={article.id} article={article} variant="horizontal" />
          ))}
        </div>
      )}
    </section>
  )
}

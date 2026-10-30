"use client"

import Link from "next/link"
import useSWR from "swr"
import { ArrowRight, SlidersHorizontal } from "lucide-react"
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

  // Same height as the guest card: the block below does not jump when the session resolves
  if (sessionLoading) return <div aria-hidden className="h-[184px] animate-pulse rounded-[28px] bg-white/50 md:h-[136px]" />

  if (!member) {
    return (
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0e7490] via-[#0b5b70] to-[#123a63] p-6 text-white md:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#5eead4] opacity-30 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">
            <SlidersHorizontal className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-[22px] font-bold leading-snug">Соберите ленту под себя</h2>
            <p className="mt-1 text-white/80">
              Зарегистрируйтесь бесплатно: выберите животных, специализации и методы диагностики — и получайте только
              нужные вам материалы, а по понедельникам — дайджест недели.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/register" className="rounded-xl bg-white px-5 py-2.5 text-[14px] font-semibold text-[#0b4553] hover:bg-white/90">
              Зарегистрироваться
            </Link>
            <Link href="/login" className="rounded-xl border border-white/30 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-white/10">
              Войти
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const articles = data?.articles ?? []

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="text-[26px] font-bold tracking-[-0.02em] md:text-[32px]">Моя лента</h2>
        <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          {data?.personalized ? "Вся лента" : "Настроить ленту"} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {feedLoading ? (
        <div aria-hidden className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-24 w-32 shrink-0 animate-pulse rounded-2xl bg-stone-200/60" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-20 animate-pulse rounded bg-stone-200/60" />
                <div className="h-4 w-full animate-pulse rounded bg-stone-200/60" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200/60" />
              </div>
            </div>
          ))}
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

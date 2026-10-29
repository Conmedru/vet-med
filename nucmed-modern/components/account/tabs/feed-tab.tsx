"use client"

import * as React from "react"
import useSWR from "swr"
import Link from "next/link"
import { Loader2, Inbox } from "lucide-react"
import { DBArticleCard } from "@/components/articles/article-card"
import { RubricPicker } from "@/components/admin/rubric-picker"
import type { DBArticle } from "@/lib/articles"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * «Лента новостей» личного кабинета (ТЗ клиента, п. 14): врач выбирает рубрики —
 * животных, специализации, методы диагностики, разделы — и видит материалы по ним.
 */
export function FeedTab() {
  const { data, mutate } = useSWR<{ articles: DBArticle[]; rubrics: string[] }>("/api/member/feed?limit=30", fetcher, {
    keepPreviousData: true,
  })
  const [isUpdating, setIsUpdating] = React.useState(false)
  const rubrics = data?.rubrics ?? []

  async function changeRubrics(next: string[]) {
    // Optimistic update of the selection, articles refresh after the save
    await mutate(data ? { ...data, rubrics: next } : data, { revalidate: false })
    setIsUpdating(true)
    try {
      await fetch("/api/member/feed-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubrics: next }),
      })
    } finally {
      await mutate()
      setIsUpdating(false)
    }
  }

  const articles = data?.articles ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 max-w-6xl">
      <div className="order-2 lg:order-1">
        {!data ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="mx-auto mb-3 text-muted-foreground" />
            <p className="t-body">
              Пока нет материалов по выбранным рубрикам. Добавьте рубрики или посмотрите{" "}
              <Link href="/news" className="text-primary hover:underline">
                все материалы
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {articles.map((article) => (
              <DBArticleCard key={article.id} article={article} variant="horizontal" />
            ))}
          </div>
        )}
      </div>

      <aside className="order-1 lg:order-2">
        <div className="rounded-[24px] border border-white/80 bg-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_20px_50px_-28px_rgba(11,42,51,0.28)] backdrop-blur-xl p-5 lg:sticky lg:top-32">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold">Моя лента</h3>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {rubrics.length > 0
              ? "Показываем материалы по выбранным рубрикам."
              : "Рубрики не выбраны — показываем все материалы."}
          </p>
          <RubricPicker value={rubrics} onChange={changeRubrics} warnMissing={false} includeHidden={false} />
        </div>
      </aside>
    </div>
  )
}

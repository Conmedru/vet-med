"use client"

import * as React from "react"
import useSWR, { useSWRConfig } from "swr"
import { Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RubricPicker } from "@/components/admin/rubric-picker"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const cardClass =
  "rounded-[24px] border border-white/80 bg-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_20px_50px_-28px_rgba(11,42,51,0.28)] backdrop-blur-xl p-6"

/**
 * «Еженедельный дайджест»: подписка на письмо с главными материалами недели по понедельникам
 * и интересующие темы, как на onco-compass (клиент, 2026-11-07). Темы — те же member.rubrics,
 * что у «Ленты новостей»: один выбор на кабинет, не второе поле.
 */
export function DigestTab() {
  const { data, mutate } = useSWR("/api/member/profile", fetcher)
  const { mutate: mutateKey } = useSWRConfig()
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSavingTopics, setIsSavingTopics] = React.useState(false)
  const digestEnabled: boolean = data?.member?.digestEnabled ?? false
  const rubrics: string[] = data?.member?.rubrics ?? []

  async function toggleDigest() {
    setIsSaving(true)
    try {
      await fetch("/api/member/feed-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestEnabled: !digestEnabled }),
      })
      await mutate()
    } finally {
      setIsSaving(false)
    }
  }

  async function changeTopics(next: string[]) {
    // Optimistic update; the feed tab reloads its articles for the new choice
    await mutate(data ? { ...data, member: { ...data.member, rubrics: next } } : data, { revalidate: false })
    setIsSavingTopics(true)
    try {
      await fetch("/api/member/feed-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubrics: next }),
      })
    } finally {
      await Promise.all([mutate(), mutateKey((key) => typeof key === "string" && key.startsWith("/api/member/feed"))])
      setIsSavingTopics(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className={cardClass}>
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Еженедельный дайджест</h3>
            <p className="t-body mt-1">
              Каждый понедельник — подборка главных материалов недели на {data?.member?.email || "вашу почту"}.
            </p>
            <Button className="mt-4" variant={digestEnabled ? "outline" : "default"} onClick={toggleDigest} disabled={!data || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {digestEnabled ? "Отписаться" : "Подписаться"}
            </Button>
            {digestEnabled && <p className="text-sm text-muted-foreground mt-2">Вы подписаны на дайджест.</p>}
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold">Интересующие темы</h3>
          {isSavingTopics && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {rubrics.length > 0
            ? "Отмеченные темы сохранены. По ним собирается ваша «Лента новостей» в кабинете."
            : "Отметьте животных, специализации и разделы, которые вам интересны. По ним собирается ваша «Лента новостей» в кабинете."}
        </p>
        {data ? (
          <RubricPicker value={rubrics} onChange={changeTopics} warnMissing={false} />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  )
}

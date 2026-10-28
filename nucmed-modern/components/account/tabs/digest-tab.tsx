"use client"

import * as React from "react"
import useSWR from "swr"
import { Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/** «Еженедельный дайджест»: подписка на письмо с главными материалами недели по понедельникам */
export function DigestTab() {
  const { data, mutate } = useSWR("/api/member/profile", fetcher)
  const [isSaving, setIsSaving] = React.useState(false)
  const digestEnabled: boolean = data?.member?.digestEnabled ?? false

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

  return (
    <div className="max-w-2xl rounded-xl border bg-card p-6">
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
  )
}

"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DigestTab } from "./tabs/digest-tab"
import { FeedTab } from "./tabs/feed-tab"
import { ProfileTab } from "./tabs/profile-tab"
import { useMemberSession } from "@/lib/hooks/use-member-session"

export function AccountView() {
  const { member } = useMemberSession()

  return (
    <div className="container py-10 md:py-14">
      <div className="mb-8">
        <div className="eyebrow eyebrow-teal mb-2">Личный кабинет</div>
        <h1 className="font-bold tracking-tight text-[28px] md:text-[32px]" style={{ color: "var(--ink)" }}>
          {member ? `${member.firstName} ${member.lastName}` : "Личный кабинет"}
        </h1>
        {member && (
          <p className="t-body mt-1" style={{ color: "var(--ink-3)" }}>
            {member.specialtyName}
          </p>
        )}
      </div>

      {member && !member.emailVerified && <VerifyEmailBanner email={member.email} />}

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="feed">Лента новостей</TabsTrigger>
          <TabsTrigger value="digest">Еженедельный дайджест</TabsTrigger>
          <TabsTrigger value="profile">Мои данные</TabsTrigger>
        </TabsList>

        <TabsContent value="digest">
          <DigestTab />
        </TabsContent>
        <TabsContent value="feed">
          <FeedTab />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle")
  const [message, setMessage] = React.useState("")

  async function resend() {
    setState("sending")
    const response = await fetch("/api/member/resend-verification", { method: "POST" })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      setState("sent")
    } else {
      setState("error")
      setMessage(data.error || "Не удалось отправить письмо")
    }
  }

  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm">
      <p className="flex-1 text-stone-700">
        Подтвердите адрес <b>{email}</b> — мы отправили письмо со ссылкой при регистрации.
      </p>
      {state === "sent" ? (
        <span className="text-emerald-700 font-medium">Письмо отправлено</span>
      ) : (
        <button type="button" onClick={resend} disabled={state === "sending"} className="btn btn-ghost h-[34px]">
          {state === "sending" ? "Отправляем…" : "Отправить ещё раз"}
        </button>
      )}
      {state === "error" && <span className="text-red-600">{message}</span>}
    </div>
  )
}

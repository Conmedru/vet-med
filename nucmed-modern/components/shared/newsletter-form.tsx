"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  // Consent to mailings is required (38-ФЗ / 152-ФЗ), as in the registration form
  const [consent, setConsent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    if (!consent) {
      setStatus("error")
      setMessage("Подтвердите согласие на получение рассылки")
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "digest" }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error("Не удалось подписаться. Проверьте email и попробуйте ещё раз")
      }

      if (data.status === "member" || data.status === "known") {
        // Known address: a hint, not a re-subscription
        setStatus("error")
        setMessage(data.message)
        return
      }
      if (data.status === "already_subscribed") {
        setStatus("success")
        setMessage("Вы уже подписаны!")
      } else {
        setStatus("success")
        setMessage("Вы подписаны!")
      }
      setEmail("")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Не удалось подписаться")
    }
  }

  return (
    <form className="ym-disable-keys space-y-2" onSubmit={handleSubmit}>
      <div className="relative">
        <Input
          type="email"
          placeholder="Ваш email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "success"}
          className={cn(
            status === "error" && "border-destructive focus-visible:ring-destructive"
          )}
        />
      </div>
      
      <label className="flex cursor-pointer items-start gap-2 px-1 text-[12px] leading-snug opacity-80">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={status === "loading" || status === "success"}
          className="mt-[2px] h-3.5 w-3.5 shrink-0 accent-current"
        />
        <span>
          Соглашаюсь на получение рассылки и обработку персональных данных согласно{" "}
          <a href="/privacy" target="_blank" className="underline">политике конфиденциальности</a>
        </span>
      </label>

      {status === "error" && (
        <p className="text-xs text-destructive/90 px-1">{message}</p>
      )}

      {status === "success" ? (
        <Button type="button" variant="secondary" className="w-full gap-2 cursor-default bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {message || "Вы подписаны!"}
        </Button>
      ) : (
        <Button type="submit" className="w-full" disabled={status === "loading"}>
          {status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Подписка...
            </>
          ) : (
            "Подписаться"
          )}
        </Button>
      )}
    </form>
  )
}

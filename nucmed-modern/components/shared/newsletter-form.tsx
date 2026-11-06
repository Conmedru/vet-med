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

      // The same answer for any address (the form does not tell who is registered or subscribed)
      setStatus("success")
      setMessage(data.message || "Готово!")
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
        <p className="flex items-start gap-2 rounded-md bg-emerald-100 px-3 py-2 text-[13px] leading-snug text-emerald-800">
          <CheckCircle2 className="mt-[1px] h-4 w-4 shrink-0" />
          {message || "Готово!"}
        </p>
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

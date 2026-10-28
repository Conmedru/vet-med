"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/member/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Не удалось отправить письмо")
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-4 space-y-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "var(--teal-tint)" }}
        >
          <MailCheck size={22} style={{ color: "var(--teal-deep)" }} />
        </div>
        <p className="t-body" style={{ color: "var(--ink-2)" }}>
          Если такой email зарегистрирован, на него отправлена ссылка для восстановления пароля.
        </p>
        <Link href="/login" className="btn-link inline-flex mt-2">
          Вернуться ко входу
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="text-[13px] px-4 py-3 rounded-[6px]"
          style={{ background: "var(--gold-tint)", color: "var(--gold)" }}
        >
          {error}
        </div>
      )}
      <div>
        <label className="block text-[13px] font-medium mb-[6px]" style={{ color: "var(--ink-2)" }}>
          E-mail
        </label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <Button type="submit" className="btn btn-primary w-full h-[44px]" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Отправить ссылку
      </Button>
    </form>
  )
}

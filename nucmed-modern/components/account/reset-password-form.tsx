"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/member/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Не удалось изменить пароль")
      setDone(true)
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <p className="t-body text-center" style={{ color: "var(--ink-2)" }}>
        Ссылка недействительна. Запросите восстановление пароля{" "}
        <Link href="/forgot-password" style={{ color: "var(--teal)" }}>
          заново
        </Link>
        .
      </p>
    )
  }

  if (done) {
    return (
      <div className="text-center py-4 space-y-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "var(--teal-tint)" }}
        >
          <CheckCircle2 size={22} style={{ color: "var(--teal-deep)" }} />
        </div>
        <p className="t-body" style={{ color: "var(--ink-2)" }}>
          Пароль изменён. Переходим ко входу…
        </p>
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
          Новый пароль
        </label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          autoFocus
        />
      </div>
      <Button type="submit" className="btn btn-primary w-full h-[44px]" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Сохранить пароль
      </Button>
    </form>
  )
}

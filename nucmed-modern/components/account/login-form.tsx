"use client"

import * as React from "react"
import { safeRedirectPath } from "@/lib/auth/member-types"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMemberSession } from "@/lib/hooks/use-member-session"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirectPath(searchParams.get("redirect"))
  // Keep the return path when switching between login and registration
  const redirectQuery = redirectTo !== "/account" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""
  const { refresh } = useMemberSession()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Не удалось войти")
      }

      await refresh()
      router.push(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так")
    } finally {
      setIsSubmitting(false)
    }
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

      <div>
        <div className="flex items-baseline justify-between mb-[6px]">
          <label className="text-[13px] font-medium" style={{ color: "var(--ink-2)" }}>
            Пароль
          </label>
          <Link href="/forgot-password" className="text-[12.5px]" style={{ color: "var(--teal)" }}>
            Забыли пароль?
          </Link>
        </div>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="btn btn-primary w-full h-[44px]" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Войти
      </Button>

      <p className="text-center text-[13px]" style={{ color: "var(--ink-3)" }}>
        Ещё нет аккаунта?{" "}
        <Link href={`/register${redirectQuery}`} className="font-medium" style={{ color: "var(--ink)" }}>
          Зарегистрироваться
        </Link>
      </p>
    </form>
  )
}

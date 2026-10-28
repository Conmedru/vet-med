"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export function VerifyEmailStatus() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [status, setStatus] = React.useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  )

  React.useEffect(() => {
    if (!token) return
    fetch("/api/member/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? "success" : "error"))
      .catch(() => setStatus("error"))
  }, [token])

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Loader2 className="animate-spin" style={{ color: "var(--ink-3)" }} />
        <p className="t-body" style={{ color: "var(--ink-2)" }}>
          Подтверждаем email…
        </p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="text-center py-4 space-y-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "var(--teal-tint)" }}
        >
          <CheckCircle2 size={22} style={{ color: "var(--teal-deep)" }} />
        </div>
        <p className="t-body" style={{ color: "var(--ink-2)" }}>
          Email подтверждён. Спасибо!
        </p>
        <Link href="/account" className="btn-link inline-flex mt-2">
          Перейти в личный кабинет
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center py-4 space-y-3">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
        style={{ background: "var(--gold-tint)" }}
      >
        <XCircle size={22} style={{ color: "var(--gold)" }} />
      </div>
      <p className="t-body" style={{ color: "var(--ink-2)" }}>
        Ссылка недействительна или уже была использована.
      </p>
      <Link href="/account" className="btn-link inline-flex mt-2">
        Перейти в личный кабинет
      </Link>
    </div>
  )
}

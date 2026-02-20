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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

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
        throw new Error(data.error || "Failed to subscribe")
      }

      if (data.status === 'already_subscribed') {
        setStatus("success")
        setMessage("Вы уже подписаны!")
      } else {
        setStatus("success")
        setMessage("Вы подписаны!")
      }
      setEmail("")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Something went wrong")
    }
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
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

"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { NOSOLOGIES, SPECIAL_SECTIONS } from "@/lib/config/constants"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, AlertCircle, Newspaper, ListFilter, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Preferences {
  email: string
  categories: string[]
  digestEnabled: boolean
  status: string
}

export default function PreferencesPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  // Local editable state
  const [categories, setCategories] = useState<string[]>([])
  const [digestEnabled, setDigestEnabled] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError("Token not provided")
      return
    }

    fetch(`/api/newsletter/preferences?token=${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => {
        setPrefs(data)
        setCategories(data.categories)
        setDigestEnabled(data.digestEnabled)
      })
      .catch(() => setError("Subscription not found or invalid link."))
      .finally(() => setLoading(false))
  }, [token])

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch("/api/newsletter/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, categories, digestEnabled }),
      })

      if (!res.ok) throw new Error("Failed to save")

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-2xl py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !prefs) {
    return (
      <div className="container max-w-2xl py-20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Link not valid</h1>
          <p className="text-muted-foreground">{error || "Subscription not found."}</p>
          <Button asChild variant="outline">
            <Link href="/">Back to homepage</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-10 md:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        На главную
      </Link>

      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Управление подпиской</h1>
        <p className="text-muted-foreground">
          {prefs.email} &mdash; настройте какие уведомления вы хотите получать.
        </p>
      </div>

      {/* Digest toggle */}
      <div className="bg-white rounded-2xl border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Newspaper className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium">Еженедельный дайджест</p>
              <p className="text-sm text-muted-foreground">Все новости за неделю по понедельникам</p>
            </div>
          </div>
          <button
            onClick={() => setDigestEnabled(!digestEnabled)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              digestEnabled ? "bg-emerald-500" : "bg-stone-200"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                digestEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Category subscriptions */}
      <div className="bg-white rounded-2xl border p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ListFilter className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Подписка на нозологии</p>
            <p className="text-sm text-muted-foreground">Получайте уведомления по выбранным разделам</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase mb-3">Нозологии</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {NOSOLOGIES.map((cat) => (
                <label
                  key={cat}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                    categories.includes(cat)
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "border-stone-100 hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="rounded border-stone-300 text-primary focus:ring-primary/20"
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-stone-500 uppercase mb-3">Спецразделы</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {SPECIAL_SECTIONS.map((cat) => (
                <label
                  key={cat}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                    categories.includes(cat)
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "border-stone-100 hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="rounded border-stone-300 text-primary focus:ring-primary/20"
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save + Unsubscribe */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Сохранено!
            </>
          ) : (
            "Сохранить настройки"
          )}
        </Button>

        <Link
          href={`/api/newsletter/unsubscribe?token=${token}`}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors underline underline-offset-4"
        >
          Отписаться от всего
        </Link>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        Выбрано нозологий: {categories.length}
        {digestEnabled && " + еженедельный дайджест"}
      </p>
    </div>
  )
}

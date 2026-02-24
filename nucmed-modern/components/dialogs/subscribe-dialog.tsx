"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, Mail, Newspaper, ListFilter, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { NOSOLOGIES, SPECIAL_SECTIONS } from "@/lib/config/constants"

type SubType = "digest" | "categories" | "all"

interface SubscribeDialogProps {
  trigger?: React.ReactNode
  initialCategory?: string
}

export function SubscribeDialog({ trigger, initialCategory }: SubscribeDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<"type" | "categories" | "email">("type")
  const [email, setEmail] = React.useState("")
  const [subType, setSubType] = React.useState<SubType>(initialCategory ? "categories" : "digest")
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    initialCategory ? [initialCategory] : []
  )
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState("")

  React.useEffect(() => {
    if (open && initialCategory) {
      setSubType("categories")
      setSelectedCategories([initialCategory])
      setStep("categories")
    }
  }, [open, initialCategory])

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const handleNext = () => {
    if (subType === "categories") {
      setStep("categories")
    } else {
      setStep("email")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus("loading")
    setErrorMessage("")

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          type: subType,
          categories: subType === "categories" ? selectedCategories : [],
          digestEnabled: subType === "digest" || subType === "all",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to subscribe")
      }

      setStatus("success")
      setEmail("")
      setTimeout(() => {
        setOpen(false)
        setStatus("idle")
        setStep("type")
      }, 2500)
    } catch (error) {
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong")
    }
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) {
      setStep("type")
      setStatus("idle")
      setErrorMessage("")
      if (!initialCategory) {
        setSelectedCategories([])
        setSubType("digest")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button>Подписаться</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Подписка на новости</DialogTitle>
          <DialogDescription>
            {step === "type" && "Выберите удобный формат подписки."}
            {step === "categories" && "Отметьте интересующие нозологии и разделы."}
            {step === "email" && "Укажите email для получения рассылки."}
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            <div className="rounded-full bg-emerald-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-xl text-emerald-900">Вы успешно подписаны!</h3>
            <p className="text-stone-500">
              {subType === "categories"
                ? `Подписка на ${selectedCategories.length} ${selectedCategories.length === 1 ? "раздел" : "разделов"} оформлена.`
                : "Спасибо, что остаетесь с нами."}
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Choose type */}
            {step === "type" && (
              <div className="space-y-4 pt-2">
                <RadioGroup
                  value={subType}
                  onValueChange={(v) => setSubType(v as SubType)}
                  className="grid gap-3"
                >
                  <div>
                    <RadioGroupItem value="digest" id="digest" className="peer sr-only" />
                    <Label
                      htmlFor="digest"
                      className="flex items-start gap-4 rounded-xl border-2 border-muted p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Newspaper className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium leading-none">Еженедельный дайджест</p>
                        <p className="text-sm text-muted-foreground">
                          Все новости за неделю в одном письме по понедельникам.
                        </p>
                      </div>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="categories" id="categories" className="peer sr-only" />
                    <Label
                      htmlFor="categories"
                      className="flex items-start gap-4 rounded-xl border-2 border-muted p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <ListFilter className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium leading-none">По нозологиям</p>
                        <p className="text-sm text-muted-foreground">
                          Выберите конкретные разделы — получайте только то, что актуально.
                        </p>
                      </div>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="all" id="all" className="peer sr-only" />
                    <Label
                      htmlFor="all"
                      className="flex items-start gap-4 rounded-xl border-2 border-muted p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Mail className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium leading-none">Все новости</p>
                        <p className="text-sm text-muted-foreground">
                          Уведомления сразу после публикации любой статьи.
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                <Button className="w-full" onClick={handleNext}>
                  Далее
                </Button>
              </div>
            )}

            {/* Step 2: Category picker */}
            {step === "categories" && (
              <div className="space-y-4 pt-2">
                <button
                  onClick={() => setStep("type")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </button>

                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2">Нозологии</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {NOSOLOGIES.map((cat) => (
                      <label
                        key={cat}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                          selectedCategories.includes(cat)
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-transparent hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="rounded border-stone-300 text-primary focus:ring-primary/20"
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2">Спецразделы</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SPECIAL_SECTIONS.map((cat) => (
                      <label
                        key={cat}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                          selectedCategories.includes(cat)
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-transparent hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="rounded border-stone-300 text-primary focus:ring-primary/20"
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-background pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Выбрано: {selectedCategories.length} {selectedCategories.length === 1 ? "раздел" : "разделов"}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setStep("email")}
                    disabled={selectedCategories.length === 0}
                  >
                    Далее
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Email */}
            {step === "email" && (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(subType === "categories" ? "categories" : "type")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Назад
                </button>

                {subType === "categories" && selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Ваш Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@clinic.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "loading"}
                    autoFocus
                    className={cn(
                      status === "error" && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {status === "error" && (
                    <p className="text-xs text-destructive">{errorMessage}</p>
                  )}
                </div>

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
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

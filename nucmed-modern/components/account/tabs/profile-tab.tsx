"use client"

import * as React from "react"
import useSWR from "swr"
import { Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Combobox, FreeTextCombobox } from "@/components/ui/combobox"
import { PRIORITY_SPECIALTIES, OTHER_SPECIALTIES, OTHER_SPECIALTY_SLUG } from "@/lib/data/specialties"
import { COUNTRIES } from "@/lib/data/countries"
import { getCitiesForCountry } from "@/lib/data/geo"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ProfileFormState {
  lastName: string
  firstName: string
  middleName: string
  specialty: string
  specialtyOther: string
  phone: string
  country: string
  city: string
  interests: string
}

const SPECIALTY_OPTIONS = [
  ...PRIORITY_SPECIALTIES.map((s) => ({ value: s.slug, label: s.name })),
  ...OTHER_SPECIALTIES.map((s) => ({ value: s.slug, label: s.name })),
  { value: OTHER_SPECIALTY_SLUG, label: "Другая специальность" },
]
const COUNTRY_NAMES = COUNTRIES.map((c) => c.name)

/**
 * Раздел «Мои данные» (ТЗ п.3.3) — данные из формы регистрации с
 * возможностью их изменить, плюс смена пароля отдельным блоком.
 */
export function ProfileTab() {
  const { data, isLoading, mutate } = useSWR("/api/member/profile", fetcher)
  const member = data?.member

  const [form, setForm] = React.useState<ProfileFormState | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (member && !form) {
      setForm({
        lastName: member.lastName,
        firstName: member.firstName,
        middleName: member.middleName,
        specialty: member.specialty,
        specialtyOther: member.specialtyOther || "",
        phone: member.phone || "",
        country: member.country,
        city: member.city,
        interests: (member.interests || []).join(", "),
      })
    }
  }, [member, form])

  const citySuggestions = React.useMemo(
    () => (form ? getCitiesForCountry(form.country) : []),
    [form?.country]
  )

  if (isLoading || !form) {
    return <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ink-3)" }} />
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setError(null)
    setIsSaving(true)
    try {
      const res = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          interests: form.interests
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
        }),
      })
      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error || "Не удалось сохранить")
      await mutate()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-10">
      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="text-[13px] px-4 py-3 rounded-[6px]" style={{ background: "var(--gold-tint)", color: "var(--gold)" }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRO label="E-mail" value={member.email} />
          <div>
            <FieldLabel>Специальность</FieldLabel>
            <Combobox
              options={SPECIALTY_OPTIONS}
              value={form.specialty}
              onChange={(v) => setForm({ ...form, specialty: v })}
            />
          </div>
        </div>

        {form.specialty === OTHER_SPECIALTY_SLUG && (
          <div>
            <FieldLabel>Уточните специальность</FieldLabel>
            <input
              className="input"
              value={form.specialtyOther}
              onChange={(e) => setForm({ ...form, specialtyOther: e.target.value })}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabel>Фамилия</FieldLabel>
            <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Имя</FieldLabel>
            <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Отчество</FieldLabel>
            <input className="input" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Мобильный телефон</FieldLabel>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Страна</FieldLabel>
            <FreeTextCombobox
              value={form.country}
              onChange={(v) => setForm({ ...form, country: v, city: "" })}
              suggestions={COUNTRY_NAMES}
            />
          </div>
          <div>
            <FieldLabel>Город</FieldLabel>
            <FreeTextCombobox
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
              suggestions={citySuggestions}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Профессиональные интересы</FieldLabel>
          <input
            className="input"
            value={form.interests}
            onChange={(e) => setForm({ ...form, interests: e.target.value })}
            placeholder="Через запятую"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" className="btn btn-primary h-[40px]" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Сохранить изменения
          </Button>
          {saved && (
            <span className="text-[13px] flex items-center gap-1" style={{ color: "var(--teal)" }}>
              <CheckCircle2 size={15} /> Сохранено
            </span>
          )}
        </div>
      </form>

      <ChangePasswordForm />
    </div>
  )
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      const res = await fetch("/api/member/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Не удалось изменить пароль")
      setCurrentPassword("")
      setNewPassword("")
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="pt-8 border-t" style={{ borderColor: "var(--rule)" }}>
      <h3 className="h-section text-[17px] mb-4" style={{ color: "var(--ink)" }}>
        Смена пароля
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {error && (
          <div className="text-[13px] px-4 py-3 rounded-[6px]" style={{ background: "var(--gold-tint)", color: "var(--gold)" }}>
            {error}
          </div>
        )}
        <div>
          <FieldLabel>Текущий пароль</FieldLabel>
          <input
            className="input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <FieldLabel>Новый пароль</FieldLabel>
          <input
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" className="btn btn-ghost h-[38px]" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Изменить пароль
          </Button>
          {saved && (
            <span className="text-[13px] flex items-center gap-1" style={{ color: "var(--teal)" }}>
              <CheckCircle2 size={15} /> Пароль изменён
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-medium mb-[6px]" style={{ color: "var(--ink-2)" }}>
      {children}
    </label>
  )
}

function FieldRO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="input flex items-center" style={{ color: "var(--ink-3)", background: "var(--rule-soft)" }}>
        {value}
      </div>
    </div>
  )
}

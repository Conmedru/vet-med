"use client"

import * as React from "react"
import { safeRedirectPath } from "@/lib/auth/member-types"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox, FreeTextCombobox } from "@/components/ui/combobox"
import { PRIORITY_SPECIALTIES, OTHER_SPECIALTIES, OTHER_SPECIALTY_SLUG } from "@/lib/data/specialties"
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/data/countries"
import { getCitiesForCountry } from "@/lib/data/geo"
import { useMemberSession } from "@/lib/hooks/use-member-session"

const SPECIALTY_OPTIONS = [
  ...PRIORITY_SPECIALTIES.map((s) => ({ value: s.slug, label: s.name })),
  ...OTHER_SPECIALTIES.map((s) => ({ value: s.slug, label: s.name })),
  { value: OTHER_SPECIALTY_SLUG, label: "Другая специальность" },
]

const COUNTRY_NAMES = COUNTRIES.map((c) => c.name)

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirectPath(searchParams.get("redirect"))
  // Keep the return path when switching between login and registration
  const redirectQuery = redirectTo !== "/account" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""
  const { refresh } = useMemberSession()

  const [lastName, setLastName] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [middleName, setMiddleName] = React.useState("")
  const [specialty, setSpecialty] = React.useState("")
  const [specialtyOther, setSpecialtyOther] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [country, setCountry] = React.useState(DEFAULT_COUNTRY)
  const [city, setCity] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [interests, setInterests] = React.useState("")
  const [consentHealthcare, setConsentHealthcare] = React.useState(false)
  const [consentPd152, setConsentPd152] = React.useState(false)
  const [consentPd156, setConsentPd156] = React.useState(false)
  const [consentMarketing, setConsentMarketing] = React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  const citySuggestions = React.useMemo(() => getCitiesForCountry(country), [country])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/member/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName,
          firstName,
          middleName,
          specialty,
          specialtyOther: specialty === OTHER_SPECIALTY_SLUG ? specialtyOther : undefined,
          email,
          phone: phone || undefined,
          country,
          city,
          password,
          interests: interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          consentHealthcare,
          consentPd152,
          consentPd156,
          consentMarketing,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.details) {
          const flat: Record<string, string> = {}
          for (const [key, value] of Object.entries<{ _errors?: string[] }>(data.details)) {
            if (value?._errors?.[0]) flat[key] = value._errors[0]
          }
          setFieldErrors(flat)
        }
        throw new Error(data.error || "Не удалось зарегистрироваться")
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="text-[13px] px-4 py-3 rounded-[6px]"
          style={{ background: "var(--gold-tint)", color: "var(--gold)" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Фамилия" required error={fieldErrors.lastName}>
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </Field>
        <Field label="Имя" required error={fieldErrors.firstName}>
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </Field>
        <Field label="Отчество" required error={fieldErrors.middleName}>
          <input className="input" value={middleName} onChange={(e) => setMiddleName(e.target.value)} required />
        </Field>
      </div>

      <Field label="Специальность" required error={fieldErrors.specialty}>
        <Combobox
          options={SPECIALTY_OPTIONS}
          value={specialty}
          onChange={setSpecialty}
          placeholder="Выберите специальность"
          searchPlaceholder="Поиск специальности..."
        />
      </Field>

      {specialty === OTHER_SPECIALTY_SLUG && (
        <Field label="Уточните специальность" required error={fieldErrors.specialtyOther}>
          <input
            className="input"
            value={specialtyOther}
            onChange={(e) => setSpecialtyOther(e.target.value)}
            placeholder="Например: медицинская физика"
          />
        </Field>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="E-mail" required error={fieldErrors.email}>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Мобильный телефон" error={fieldErrors.phone}>
          <input
            className="input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 900 000-00-00"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Страна" required error={fieldErrors.country}>
          <FreeTextCombobox
            value={country}
            onChange={(v) => {
              setCountry(v)
              setCity("")
            }}
            suggestions={COUNTRY_NAMES}
            placeholder="Начните вводить страну"
          />
        </Field>
        <Field label="Город" required error={fieldErrors.city}>
          <FreeTextCombobox
            value={city}
            onChange={setCity}
            suggestions={citySuggestions}
            placeholder="Начните вводить город"
          />
        </Field>
      </div>

      <Field label="Пароль" required error={fieldErrors.password}>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <p className="text-[12px] mt-1" style={{ color: "var(--ink-3)" }}>
          Не менее 8 символов.
        </p>
      </Field>

      <Field
        label="Ваши профессиональные интересы"
        hint="Например: кардиология кошек, экзотические животные, УЗИ. Мы используем это, чтобы подбирать для вас материалы."
      >
        <input
          className="input"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="Через запятую"
        />
      </Field>

      <div className="space-y-3 pt-2">
        <ConsentRow checked={consentHealthcare} onChange={setConsentHealthcare} required>
          Настоящим я подтверждаю, что являюсь ветеринарным специалистом
        </ConsentRow>
        <ConsentRow checked={consentMarketing} onChange={setConsentMarketing}>
          Соглашаюсь на получение рассылок (еженедельный дайджест материалов)
        </ConsentRow>
        <ConsentRow checked={consentPd152} onChange={setConsentPd152} required>
          Соглашаюсь на сбор и обработку персональных данных согласно Федеральному закону №152-ФЗ «О персональных данных» и{" "}
          <LegalLink href="/privacy">политике конфиденциальности</LegalLink>
        </ConsentRow>
        <ConsentRow checked={consentPd156} onChange={setConsentPd156} required>
          Согласен на передачу персональных данных третьим лицам согласно Федеральному закону №156-ФЗ от 24 июня 2025 года и{" "}
          <LegalLink href="/terms">условиям использования</LegalLink>
        </ConsentRow>
      </div>

      <Button type="submit" className="btn btn-primary w-full h-[44px]" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Зарегистрироваться
      </Button>

      <p className="text-center text-[13px]" style={{ color: "var(--ink-3)" }}>
        Уже есть аккаунт?{" "}
        <Link href={`/login${redirectQuery}`} className="font-medium" style={{ color: "var(--ink)" }}>
          Войти
        </Link>
      </p>
    </form>
  )
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium mb-[6px]" style={{ color: "var(--ink-2)" }}>
        {label}
        {required && <span style={{ color: "var(--red)" }}> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[12px] mt-1" style={{ color: "var(--ink-3)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-[12px] mt-1" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
    </div>
  )
}

/** Opens in a new tab so the filled form is not lost */
function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--teal)" }}>
      {children}
    </a>
  )
}

function ConsentRow({
  checked,
  onChange,
  required,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex items-start gap-[10px] cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} required={required} className="mt-[3px]" />
      <span className="text-[13px] leading-[1.5]" style={{ color: "var(--ink-2)" }}>
        {children}
        {required && <span style={{ color: "var(--red)" }}> *</span>}
      </span>
    </label>
  )
}

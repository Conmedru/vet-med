"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, LogOut, User, UserPlus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMemberSession } from "@/lib/hooks/use-member-session"

/**
 * Заменяет заглушку AuthDialog в хедере (см. components/dialogs/auth-dialog.tsx):
 * показывает «Войти / Регистрация» для гостя и меню специалиста после входа.
 * Живёт в клиентском компоненте, потому что (main)/layout.tsx кэшируется
 * (`revalidate = 3600`) — статус авторизации не должен «прилипать» к кэшу.
 */
export function MemberMenu({ mobile }: { mobile?: boolean }) {
  const { member, isLoading, refresh } = useMemberSession()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  async function handleLogout() {
    await fetch("/api/member/session", { method: "DELETE" })
    await refresh()
    setOpen(false)
    router.push("/")
  }

  if (isLoading) {
    return <div className={mobile ? "h-[42px]" : "h-[38px] w-[120px]"} />
  }

  if (!member) {
    if (mobile) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Link href="/login" className="btn btn-ghost h-[42px] gap-[6px]">
            <LogIn size={16} />
            Войти
          </Link>
          <Link href="/register" className="btn btn-primary h-[42px] gap-[6px]">
            <UserPlus size={16} />
            Регистрация
          </Link>
        </div>
      )
    }
    return (
      <div className="hidden md:flex items-center gap-[8px]">
        <Link href="/login" className="btn h-[40px] px-3 text-[var(--ink)] hover:bg-white/70">
          Войти
        </Link>
        <Link href="/register" className="btn btn-primary h-[40px]">
          Регистрация
        </Link>
      </div>
    )
  }

  const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase()

  if (mobile) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href="/account"
          className="flex items-center gap-[10px] px-[12px] py-[11px] rounded-[6px]"
          style={{ background: "var(--rule-soft)" }}
        >
          <span
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center font-serif font-semibold text-[13px] shrink-0"
            style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}
          >
            {initials}
          </span>
          <span className="text-[14px] font-medium truncate" style={{ color: "var(--ink)" }}>
            {member.firstName} {member.lastName}
          </span>
        </Link>
        <button onClick={handleLogout} className="btn btn-ghost h-[38px] w-full gap-[6px]">
          <LogOut size={15} />
          Выйти
        </button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="hidden md:flex items-center gap-[8px] h-[38px] px-[8px] rounded-[6px] hover:bg-[var(--rule-soft)] transition-colors">
          <span
            className="w-[28px] h-[28px] rounded-full flex items-center justify-center font-serif font-semibold text-[12px] shrink-0"
            style={{ background: "var(--teal-tint)", color: "var(--teal-deep)" }}
          >
            {initials}
          </span>
          <span className="text-[13.5px] font-medium max-w-[120px] truncate" style={{ color: "var(--ink)" }}>
            {member.firstName}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[220px] p-1.5">
        <div className="px-3 py-2 mb-1 border-b" style={{ borderColor: "var(--rule)" }}>
          <div className="text-[13.5px] font-medium truncate" style={{ color: "var(--ink)" }}>
            {member.firstName} {member.lastName}
          </div>
          <div className="text-[12px] truncate" style={{ color: "var(--ink-3)" }}>
            {member.email}
          </div>
        </div>
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className="flex items-center gap-[8px] px-3 py-2 rounded-[6px] text-[13.5px] hover:bg-[var(--rule-soft)] transition-colors"
          style={{ color: "var(--ink-2)" }}
        >
          <User size={15} />
          Личный кабинет
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-[8px] px-3 py-2 rounded-[6px] text-[13.5px] hover:bg-[var(--rule-soft)] transition-colors"
          style={{ color: "var(--ink-2)" }}
        >
          <LogOut size={15} />
          Выйти
        </button>
      </PopoverContent>
    </Popover>
  )
}

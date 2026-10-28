import Link from "next/link"
import { ShieldCheck } from "lucide-react"

/**
 * Плашка закрытого материала (ТЗ п.1). Текст воспроизводит формулировки из
 * технического задания; визуально — в стилистике портала (paper/ink/teal),
 * а не референса из ТЗ (тот сайт использует другую дизайн-систему).
 */
export function ArticlePaywall({ redirectPath }: { redirectPath: string }) {
  const loginHref = `/login?redirect=${encodeURIComponent(redirectPath)}`
  const registerHref = `/register?redirect=${encodeURIComponent(redirectPath)}`

  return (
    <div className="relative mt-10">
      {/* Затухание текста над плашкой создаёт ощущение, что материал обрывается,
          а не просто заканчивается — сигнал «здесь есть продолжение». */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-20 h-20"
        style={{ background: "linear-gradient(to top, var(--bg), transparent)" }}
      />

      <div className="card p-8 md:p-10 text-center relative">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "var(--teal-tint)" }}
        >
          <ShieldCheck size={20} style={{ color: "var(--teal-deep)" }} />
        </div>

        <p className="t-body mb-4" style={{ color: "var(--ink-2)" }}>
          Данный материал содержит информацию для ветеринарных специалистов.
        </p>
        <p className="h-section text-[18px] mb-6" style={{ color: "var(--ink)" }}>
          Чтобы продолжить читать материал, вам необходимо
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap mb-8">
          <Link href={loginHref} className="btn btn-ghost h-[42px] px-6">
            Войти
          </Link>
          <span className="text-[13px]" style={{ color: "var(--ink-3)" }}>
            или
          </span>
          <Link href={registerHref} className="btn btn-primary h-[42px] px-6">
            Зарегистрироваться
          </Link>
        </div>

        <div className="pt-6" style={{ borderTop: "1px solid var(--rule-strong)" }}>
          <p className="t-body" style={{ color: "var(--ink-2)" }}>
            Регистрация на портале CON-VET.RU бесплатна и откроет вам доступ ко всем материалам и персональной ленте.
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--ink-3)" }}>
            Присоединяйтесь уже сегодня.
          </p>
        </div>
      </div>
    </div>
  )
}

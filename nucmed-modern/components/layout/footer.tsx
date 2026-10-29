import Link from "next/link"
import { getRubricsByKind, PET_SLUGS } from "@/lib/rubrics"
import { NewsletterForm } from "@/components/shared"

const animals = getRubricsByKind("animal")

const columns: { title: string; links: { name: string; href: string }[] }[] = [
  {
    title: "Животные",
    links: [
      { name: "Все питомцы", href: "/category/pets" },
      ...animals.filter((r) => PET_SLUGS.includes(r.slug)).map((r) => ({ name: r.name, href: `/category/${r.slug}` })),
      ...animals.filter((r) => !PET_SLUGS.includes(r.slug)).map((r) => ({ name: r.shortName || r.name, href: `/category/${r.slug}` })),
    ],
  },
  {
    title: "Разделы",
    links: [
      ...getRubricsByKind("section").map((r) => ({ name: r.name, href: `/category/${r.slug}` })),
      { name: "Гайдлайны и справочники", href: "/guidelines" },
      { name: "Калькуляторы и шкалы", href: "/calculators" },
      { name: "Все новости", href: "/news" },
    ],
  },
  {
    title: "О проекте",
    links: [
      { name: "О нас", href: "/about" },
      { name: "Контакты", href: "/contact" },
      { name: "Политика конфиденциальности", href: "/privacy" },
      { name: "Условия использования", href: "/terms" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative isolate mt-16 overflow-hidden bg-gradient-to-br from-[#0b2a33] via-[#0b3f4c] to-[#14305a] text-white">
      <div aria-hidden className="absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full bg-[#22c3d6] opacity-25 blur-[100px]" />
      <div aria-hidden className="absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#8b7bff] opacity-25 blur-[100px]" />

      <div className="container grid grid-cols-1 gap-10 py-14 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Link href="/" className="inline-block rounded-2xl bg-white p-2">
            <img src="/con-vet-logo.png" alt="CON-VET.ru" className="h-8 w-auto" />
          </Link>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/75">
            Новости и исследования ветеринарной медицины для практикующих врачей: диагностика, лечение и профилактика заболеваний животных.
          </p>
          <div className="mt-6 max-w-sm rounded-[20px] border border-white/20 bg-white/10 p-4 backdrop-blur-md">
            <div className="mb-3 text-[14px] font-semibold">Дайджест по понедельникам</div>
            <NewsletterForm />
          </div>
        </div>

        {columns.map((column, index) => (
          <div key={column.title} className={`lg:col-span-2 ${index === 0 ? "lg:col-start-7" : ""}`}>
            <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-white/55">{column.title}</div>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[15px] text-white/85 transition-colors hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container py-5 text-[13px] text-white/55">
          © {new Date().getFullYear()} CON-VET.ru — ветеринарная медицина. Материалы для специалистов.
        </div>
      </div>
    </footer>
  )
}

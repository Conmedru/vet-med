import Link from "next/link"
import { animalCategoryGroups, getCategorySlug } from "@/lib/data"
import { NewsletterForm } from "@/components/shared"

const footerSections: { name: string; href: string; indent?: boolean }[] = [
  { name: "Питомцы", href: "/category/pets" },
  ...( animalCategoryGroups["Питомцы"] || []).map((cat) => ({
    name: `— ${cat}`,
    href: `/category/${getCategorySlug(cat)}`,
    indent: true,
  })),
  { name: "Экзоты", href: "/category/exotics" },
  { name: "С/х животные", href: "/category/farm-animals" },
  { name: "Нутрициология", href: "/category/nutrition" },
  { name: "Все новости", href: "/news" },
]

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center">
              <img
                src="/logo.png"
                alt="CON-VET.ru"
                className="h-20 w-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ведущий портал ветеринарной медицины. Новости и исследования в области диагностики, лечения и профилактики заболеваний животных для ветеринарных специалистов.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Разделы</h3>
            <ul className="space-y-2 text-sm">
              {footerSections.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`transition-colors hover:text-primary ${"indent" in item && item.indent ? "text-muted-foreground/70 pl-2" : "text-muted-foreground"}`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Информация</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  О нас
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Контакты
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Условия использования
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Подписка</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Получайте самые важные новости недели прямо на почту.
            </p>
            <NewsletterForm />
          </div>
        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CON-VET.ru — Ветеринарная медицина. Все права защищены.</p>
        </div>
      </div>
    </footer>
  )
}

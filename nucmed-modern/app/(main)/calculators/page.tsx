import type { Metadata } from "next"
import { Calculator, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { RubricFilter } from "@/components/references/rubric-filter"
import { CALCULATOR_SOURCES } from "@/lib/calculators"
import { getRubric } from "@/lib/rubrics"

export const metadata: Metadata = {
  title: "Калькуляторы и шкалы",
  description:
    "Ветеринарные калькуляторы: инфузии, ИПС, гемотрансфузия, площадь поверхности тела, дозы ГКС, вакцинация — со ссылками на источники.",
}

export default async function CalculatorsPage({ searchParams }: { searchParams: Promise<{ rubric?: string }> }) {
  const { rubric } = await searchParams
  const active = rubric && getRubric(rubric) ? rubric : undefined

  const available = [...new Set(CALCULATOR_SOURCES.flatMap((s) => s.items.flatMap((i) => i.rubrics)))]
  const sources = CALCULATOR_SOURCES.map((s) => ({
    ...s,
    items: active ? s.items.filter((i) => i.rubrics.includes(active)) : s.items,
  })).filter((s) => s.items.length > 0)

  return (
    <div className="container py-8 md:py-12 max-w-5xl">
      <Breadcrumbs items={[{ label: "Калькуляторы и шкалы" }]} className="mb-6" />

      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">Калькуляторы и шкалы</h1>
      <p className="text-muted-foreground text-lg max-w-3xl mb-8">
        Подборка ветеринарных калькуляторов из открытых источников. Калькуляторы открываются на сайте источника — перед
        применением результата в клинической практике проверяйте расчёт.
      </p>

      <div className="mb-10">
        <RubricFilter basePath="/calculators" available={available} active={active} />
      </div>

      <div className="space-y-12">
        {sources.map((source) => (
          <section key={source.id}>
            <div className="border-b pb-3 mb-5">
              <h2 className="text-xl md:text-2xl font-bold">{source.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {source.description} Источник:{" "}
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {new URL(source.url).hostname.replace(/^www\./, "")}
                </a>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {source.items.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-4 rounded-[24px] border border-white/80 bg-white/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9),0_20px_50px_-28px_rgba(11,42,51,0.28)] backdrop-blur-xl p-5 transition-colors hover:bg-white/80"
                >
                  <Calculator className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <div className="min-w-0">
                    <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors">
                      {item.title}
                      <ExternalLink className="inline h-3.5 w-3.5 ml-1 -mt-0.5 text-muted-foreground" />
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {item.rubrics.map((slug) => {
                        const r = getRubric(slug)
                        return r ? (
                          <Badge key={slug} variant="secondary" className="text-xs font-normal">{r.shortName || r.name}</Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

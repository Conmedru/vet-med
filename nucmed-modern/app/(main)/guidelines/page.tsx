import type { Metadata } from "next"
import { ExternalLink, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { RubricFilter } from "@/components/references/rubric-filter"
import { GUIDELINE_GROUPS } from "@/lib/guidelines"
import { getRubric } from "@/lib/rubrics"

export const metadata: Metadata = {
  title: "Гайдлайны и справочники",
  description:
    "Клинические рекомендации WSAVA, AAHA, российских профессиональных сообществ и справочники ветеринарных препаратов — со ссылками на документы, в том числе на русском языке.",
}

export default async function GuidelinesPage({ searchParams }: { searchParams: Promise<{ rubric?: string }> }) {
  const { rubric } = await searchParams
  const active = rubric && getRubric(rubric) ? rubric : undefined

  const available = [...new Set(GUIDELINE_GROUPS.flatMap((g) => g.items.flatMap((i) => i.rubrics)))]
  const groups = GUIDELINE_GROUPS.map((g) => ({
    ...g,
    items: active ? g.items.filter((i) => i.rubrics.includes(active)) : g.items,
  })).filter((g) => g.items.length > 0)

  return (
    <div className="container py-8 md:py-12 max-w-5xl">
      <Breadcrumbs items={[{ label: "Гайдлайны и справочники" }]} className="mb-6" />

      <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">Гайдлайны и справочники</h1>
      <p className="text-muted-foreground text-lg max-w-3xl mb-8">
        Клинические рекомендации международных и российских ветеринарных сообществ. Документы открываются на сайтах
        организаций; там, где есть перевод, ссылка ведёт на русскую версию.
      </p>

      <div className="mb-10">
        <RubricFilter basePath="/guidelines" available={available} active={active} />
      </div>

      <div className="space-y-12">
        {groups.map((group) => (
          <section key={group.id}>
            <div className="border-b pb-3 mb-5">
              <h2 className="text-xl md:text-2xl font-bold">
                {group.url ? (
                  <a href={group.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {group.title}
                  </a>
                ) : (
                  group.title
                )}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.items.map((item) => (
                <article key={item.url} className="flex flex-col rounded-xl border bg-card p-5">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <Badge variant={item.language === "ru" ? "default" : "outline"}>
                      {item.language === "ru" ? "На русском" : "English"}
                    </Badge>
                    {item.year && <span className="text-muted-foreground">{item.year}</span>}
                  </div>
                  <h3 className="font-semibold leading-snug">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                      {item.title}
                      <ExternalLink className="inline h-3.5 w-3.5 ml-1 -mt-0.5 text-muted-foreground" />
                    </a>
                  </h3>
                  {item.titleOriginal && <p className="text-xs text-muted-foreground mt-1">{item.titleOriginal}</p>}
                  {item.description && <p className="text-sm text-muted-foreground mt-3">{item.description}</p>}

                  {item.links && item.links.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {item.links.map((link) => (
                        <li key={link.url}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.rubrics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-4">
                      {item.rubrics.map((slug) => {
                        const r = getRubric(slug)
                        return r ? (
                          <a key={slug} href={`/guidelines?rubric=${slug}`}>
                            <Badge variant="secondary" className="text-xs font-normal">{r.shortName || r.name}</Badge>
                          </a>
                        ) : null
                      })}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

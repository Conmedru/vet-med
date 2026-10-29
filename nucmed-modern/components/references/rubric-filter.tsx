import Link from "next/link"
import { RUBRICS } from "@/lib/rubrics"
import { cn } from "@/lib/utils"

/** Rubric chips for catalog pages (guidelines, calculators): ?rubric=<slug> */
export function RubricFilter({
  basePath,
  available,
  active,
}: {
  basePath: string
  available: string[]
  active?: string
}) {
  const rubrics = RUBRICS.filter((r) => available.includes(r.slug))
  const chip = "px-3 py-1.5 text-sm rounded-full border transition-colors whitespace-nowrap"

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={basePath}
        className={cn(chip, !active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}
      >
        Все
      </Link>
      {rubrics.map((r) => (
        <Link
          key={r.slug}
          href={`${basePath}?rubric=${r.slug}`}
          className={cn(chip, active === r.slug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted")}
        >
          {r.shortName || r.name}
        </Link>
      ))}
    </div>
  )
}

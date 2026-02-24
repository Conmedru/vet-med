"use client"

import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import type { JournalIssueApiItem } from "@/lib/schemas/journal"

interface JournalBannerProps {
  issue: JournalIssueApiItem
}

export function JournalBanner({ issue }: JournalBannerProps) {
  const formattedDate = issue.publicationDate
    .slice(0, 10)
    .split("-")
    .reverse()
    .join(".")

  return (
    <section className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(196,69%,16%)] via-[hsl(189,60%,25%)] to-[hsl(189,93%,37%)]">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl" />
      </div>

      <Link
        href="/journal"
        className="group relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-8 lg:p-10 cursor-pointer"
        aria-label={`Журнал VetMed — ${issue.title}`}
      >
        {/* Cover image */}
        <div className="shrink-0 w-32 md:w-40 lg:w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-black/30 ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.03]">
          {issue.coverImageUrl ? (
            <img
              src={issue.coverImageUrl}
              alt={issue.coverAlt || issue.title}
              className="h-full w-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="h-full w-full bg-white/10 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/30" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-center md:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-cyan-200 mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            Журнал VetMed
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-white leading-tight mb-2">
            {issue.title}
          </h2>

          {/* Issue info */}
          <p className="text-cyan-200/80 text-sm md:text-base mb-4">
            {issue.issueNumber ? `Выпуск № ${issue.issueNumber}` : "Новый выпуск"}
            {" · "}
            {formattedDate}
          </p>

          {/* Description */}
          {issue.description && (
            <p className="text-white/70 text-sm md:text-base max-w-xl line-clamp-2 mb-5">
              {issue.description}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[hsl(196,69%,16%)] font-semibold text-sm shadow-lg shadow-black/10 transition-all duration-200 group-hover:shadow-xl group-hover:bg-cyan-50">
              Читать выпуск
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
            {issue.pdfUrl && (
              <span
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.open(issue.pdfUrl!, "_blank")
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/20 text-white/90 text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
              >
                Скачать PDF
              </span>
            )}
          </div>
        </div>

        {/* Hover arrow indicator (desktop) */}
        <div className="hidden lg:flex shrink-0 items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white/60 transition-all group-hover:bg-white/20 group-hover:text-white">
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </section>
  )
}

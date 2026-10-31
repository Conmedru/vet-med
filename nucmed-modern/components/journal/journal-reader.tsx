"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Online reading of an issue: page images as a spread on desktop (the cover alone, then 2–3,
 * 4–5 …) and one page on phones, with arrows, the keyboard and a strip of thumbnails.
 * Links «#page-N» (the table of contents) open page N. Images, not a PDF iframe: iOS Safari
 * shows only the first page of an embedded PDF. Pages and thumbnails are served straight from S3
 * (unoptimized): the optimizer timed out fetching 34 pages at once.
 */

const PAGE_W = 1600
const PAGE_H = 2263 // A4

const spreadOf = (page: number, count: number, wide: boolean) => {
  if (!wide || page === 1) return [page]
  const left = page % 2 === 0 ? page : page - 1
  return left + 1 <= count ? [left, left + 1] : [left]
}

export function JournalReader({ pages, thumbs, title }: { pages: string[]; thumbs: string[]; title: string }) {
  const count = pages.length
  const [page, setPage] = useState(1)
  const [wide, setWide] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)

  const spread = spreadOf(page, count, wide)
  const first = spread[0]
  const last = spread[spread.length - 1]
  const go = useCallback((target: number) => setPage(Math.min(Math.max(target, 1), count)), [count])
  const prev = () => go(wide && first > 1 ? (first === 2 ? 1 : first - 2) : first - 1)
  const next = () => go(last + 1)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const update = () => setWide(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  // «#page-12» links (the table of contents): on click, even when the hash is already the same, and on load
  useEffect(() => {
    const open = (hash: string) => {
      const m = hash.match(/^#page-(\d+)$/)
      if (!m) return false
      go(Number(m[1]))
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      return true
    }
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest?.("a[href^='#page-']")
      if (link && open(link.getAttribute("href")!)) {
        e.preventDefault()
        history.replaceState(null, "", link.getAttribute("href"))
      }
    }
    open(window.location.hash)
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [go])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  // Keep the current thumbnail in view
  useEffect(() => {
    const thumb = thumbsRef.current?.querySelector<HTMLElement>(`[data-page="${first}"]`)
    thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [first])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev() }
    if (e.key === "ArrowRight") { e.preventDefault(); next() }
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void rootRef.current?.requestFullscreen?.()
  }

  const ahead = spreadOf(Math.min(last + 1, count), count, wide).filter((p) => p > last)
  const label = spread.length > 1 ? `Стр. ${first}–${last}` : `Стр. ${first}`

  return (
    <div
      ref={rootRef}
      id="reader"
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={`${title}: чтение онлайн`}
      className={cn(
        "scroll-mt-28 rounded-[32px] bg-[#0b2a33] p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#22c3d6] sm:p-5",
        fullscreen && "flex flex-col justify-center overflow-auto rounded-none",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1 text-white/80 sm:mb-4">
        <span className="text-[13px] font-semibold tabular-nums">
          {label} <span className="font-normal text-white/50">из {count}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <ReaderButton onClick={prev} disabled={first === 1} label="Предыдущая страница"><ChevronLeft className="h-5 w-5" /></ReaderButton>
          <ReaderButton onClick={next} disabled={last === count} label="Следующая страница"><ChevronRight className="h-5 w-5" /></ReaderButton>
          <ReaderButton onClick={toggleFullscreen} label={fullscreen ? "Выйти из полноэкранного режима" : "На весь экран"} className="hidden sm:inline-flex">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </ReaderButton>
        </div>
      </div>

      <div className={cn("relative mx-auto flex justify-center", fullscreen ? "max-w-[min(100%,calc((100vh-180px)*1.414))]" : "max-w-[min(1180px,calc((100vh-300px)*1.414))]")}>
        {/* Click zones: left half back, right half forward */}
        <button type="button" onClick={prev} disabled={first === 1} aria-label="Предыдущая страница" className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-w-resize disabled:cursor-default" />
        <button type="button" onClick={next} disabled={last === count} aria-label="Следующая страница" className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-e-resize disabled:cursor-default" />
        {spread.map((p) => (
          <div key={p} className={cn("relative bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]", spread.length > 1 ? "w-1/2" : wide ? "w-1/2" : "w-full")}>
            <Image
              src={pages[p - 1]}
              alt={`${title}, страница ${p}`}
              width={PAGE_W}
              height={PAGE_H}
              unoptimized
              priority={p <= 3}
              className="h-auto w-full"
            />
          </div>
        ))}
        {/* The next spread loads in the background so turning the page is instant */}
        <div aria-hidden className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
          {ahead.map((p) => (
            <Image key={p} src={pages[p - 1]} alt="" width={PAGE_W} height={PAGE_H} unoptimized loading="eager" />
          ))}
        </div>
      </div>

      <div ref={thumbsRef} className="mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {thumbs.map((src, i) => {
          const p = i + 1
          const active = spread.includes(p)
          return (
            <button
              key={p}
              type="button"
              data-page={p}
              onClick={() => go(p)}
              aria-label={`Страница ${p}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative w-12 shrink-0 overflow-hidden rounded-[6px] ring-2 transition sm:w-14",
                active ? "ring-[#22c3d6]" : "opacity-60 ring-transparent hover:opacity-100",
              )}
            >
              <Image src={src} alt="" width={160} height={226} unoptimized className="h-auto w-full" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 text-center text-[10px] font-semibold tabular-nums text-white">{p}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ReaderButton({ onClick, disabled, label, className, children }: { onClick: () => void; disabled?: boolean; label: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10", className)}
    >
      {children}
    </button>
  )
}

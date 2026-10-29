"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Full-bleed horizontal rail: the first card lines up with the page grid, the rail runs to the
 * window edge (so cards are cut by the screen, not mid-page), no scrollbar. Arrow buttons sit
 * in the section heading next to «Все».
 */
export function RailScroller({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // scroll-padding percentages resolve against the rail itself, so mirror the resolved gutter in px
    el.style.scrollPaddingInline = getComputedStyle(el).paddingLeft;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollBy = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: reduce ? "auto" : "smooth" });
  };

  const arrow =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#0b2a33]/10 bg-white/70 text-[#0b2a33] backdrop-blur-xl transition hover:bg-white disabled:cursor-default disabled:opacity-35 disabled:hover:bg-white/70";

  // Gutter between the container edge and the window edge
  const gutter = "calc(50vw - 50%)";

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">{header}</div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <button type="button" aria-label="Назад" onClick={() => scrollBy(-1)} disabled={edges.start} className={arrow}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Дальше" onClick={() => scrollBy(1)} disabled={edges.end} className={arrow}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ marginInline: `calc(50% - 50vw)`, paddingInline: gutter }}
      >
        {children}
        {/* trailing space: inline padding is not kept at the end of a scrolling flex row */}
        <div aria-hidden className="w-px shrink-0" />
      </div>
    </>
  );
}

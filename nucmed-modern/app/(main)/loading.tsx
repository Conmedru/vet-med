/**
 * Shown at once on navigation while the server renders the page (the pages are dynamic:
 * without it a click looked like nothing happened for a second).
 */
export default function Loading() {
  const bar = "animate-pulse rounded-lg bg-stone-200/60"
  return (
    <div aria-busy="true" aria-label="Загрузка" className="container py-8 md:py-12">
      <div className={`${bar} h-4 w-40`} />
      <div className={`${bar} mt-5 h-10 w-full max-w-xl`} />
      <div className={`${bar} mt-3 h-4 w-full max-w-2xl`} />
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[24px] border border-white/80 bg-white/60">
            <div className="aspect-[16/10] animate-pulse bg-stone-200/60" />
            <div className="space-y-2.5 p-5">
              <div className={`${bar} h-3 w-24`} />
              <div className={`${bar} h-4 w-full`} />
              <div className={`${bar} h-4 w-3/4`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

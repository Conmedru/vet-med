import * as React from "react"

export function AuthShell({
  title,
  description,
  children,
  wide,
}: {
  title: string
  description?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="container py-14 md:py-20">
      <div className={`mx-auto ${wide ? "max-w-[640px]" : "max-w-[440px]"}`}>
        <div className="mb-8 text-center">
          <div className="eyebrow eyebrow-teal mb-3">Личный кабинет</div>
          <h1 className="font-bold tracking-tight text-[30px] md:text-[34px]" style={{ color: "var(--ink)" }}>
            {title}
          </h1>
          {description && (
            <p className="t-body mt-3" style={{ color: "var(--ink-3)" }}>
              {description}
            </p>
          )}
        </div>
        <div className="card p-6 md:p-8">{children}</div>
      </div>
    </div>
  )
}

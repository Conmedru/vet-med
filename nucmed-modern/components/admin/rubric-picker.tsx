"use client";

import { getRubricsByKind, RUBRIC_KIND_LABELS, type RubricKind } from "@/lib/rubrics";

const REQUIRED_KINDS: RubricKind[] = ["animal", "specialty"];

/** Multi-select of rubrics grouped by kind (admin article editor, member feed settings) */
export function RubricPicker({
  value,
  onChange,
  warnMissing = true,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  /** Mark the required kinds (animal, specialty) when nothing is chosen there */
  warnMissing?: boolean;
}) {
  const toggle = (slug: string) => {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  };

  return (
    <div className="space-y-4">
      {(Object.keys(RUBRIC_KIND_LABELS) as RubricKind[]).map((kind) => {
        const rubrics = getRubricsByKind(kind);
        const missing = warnMissing && REQUIRED_KINDS.includes(kind) && !rubrics.some((r) => value.includes(r.slug));
        return (
          <div key={kind}>
            <p className="text-xs font-medium text-stone-500 uppercase mb-2">
              {RUBRIC_KIND_LABELS[kind]}
              {missing && <span className="ml-2 normal-case text-amber-600">не выбрано</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rubrics.map((rubric) => {
                const selected = value.includes(rubric.slug);
                return (
                  <button
                    key={rubric.slug}
                    type="button"
                    onClick={() => toggle(rubric.slug)}
                    title={rubric.description}
                    className={
                      selected
                        ? "px-2.5 py-1 text-xs rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                        : "px-2.5 py-1 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                    }
                  >
                    {rubric.shortName || rubric.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

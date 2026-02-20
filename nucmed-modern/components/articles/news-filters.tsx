"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { X, Calendar, Tag, Search, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsFiltersProps {
  options: {
    categories: string[];
    popularTags: string[];
  };
  currentFilters: {
    tag?: string;
    category?: string;
    sort?: string;
    period?: string;
    from?: string;
    to?: string;
  };
}

const DATE_PRESETS = [
  { label: "Сегодня", value: "today" },
  { label: "Неделя", value: "week" },
  { label: "Месяц", value: "month" },
  { label: "Все время", value: "all" },
] as const;

export function NewsFilters({ options, currentFilters }: NewsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    // Reset page when filtering
    params.delete("page");
    
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }, [searchParams, pathname, router]);

  const clearAllFilters = () => {
    router.push(pathname);
  };

  // Calculate active filters
  const activeFilters: { key: string; label: string; value: string }[] = [];
  
  if (currentFilters.category) {
    activeFilters.push({ key: "category", label: "Рубрика", value: currentFilters.category });
  }
  if (currentFilters.tag) {
    activeFilters.push({ key: "tag", label: "Тег", value: `#${currentFilters.tag}` });
  }
  if (currentFilters.period && currentFilters.period !== "all") {
    const preset = DATE_PRESETS.find(p => p.value === currentFilters.period);
    activeFilters.push({ key: "period", label: "Период", value: preset?.label || currentFilters.period });
  }
  if (currentFilters.from || currentFilters.to) {
    const range = [currentFilters.from, currentFilters.to].filter(Boolean).join(" — ");
    activeFilters.push({ key: "dateRange", label: "Даты", value: range });
  }

  const hasActiveFilters = activeFilters.length > 0;

  // Filter popular tags by search
  const filteredTags = tagSearch
    ? options.popularTags.filter(tag => 
        tag.toLowerCase().includes(tagSearch.toLowerCase())
      )
    : options.popularTags;

  return (
    <div className="space-y-4">
      {/* Quick Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Presets */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => updateFilters({ 
                period: preset.value === "all" ? null : preset.value,
                from: null,
                to: null 
              })}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                (currentFilters.period === preset.value || (!currentFilters.period && preset.value === "all"))
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Category Quick Select */}
        <select 
          className="h-9 px-3 text-sm font-medium rounded-lg border-0 bg-muted/50 text-foreground cursor-pointer hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={currentFilters.category || ""}
          onChange={(e) => updateFilters({ category: e.target.value || null })}
        >
          <option value="">Все нозологии</option>
          <optgroup label="Нозологии">
            {options.categories.filter((_, i) => i < 12).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </optgroup>
          <optgroup label="Специальные разделы">
            {options.categories.filter((_, i) => i >= 12).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </optgroup>
        </select>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ml-auto",
            showAdvanced || hasActiveFilters
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Ещё фильтры</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs">
              {activeFilters.length}
            </Badge>
          )}
          <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
        </button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Активные фильтры:</span>
          {activeFilters.map((filter) => (
            <Badge 
              key={filter.key} 
              variant="secondary" 
              className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1"
            >
              <span className="text-muted-foreground text-xs">{filter.label}:</span>
              <span className="font-medium">{filter.value}</span>
              <button 
                onClick={() => {
                  if (filter.key === "dateRange") {
                    updateFilters({ from: null, to: null });
                  } else {
                    updateFilters({ [filter.key]: null });
                  }
                }}
                className="p-0.5 hover:bg-muted rounded-sm transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            Сбросить все
          </button>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Custom Date Range */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Диапазон дат
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={currentFilters.from || ""}
                  onChange={(e) => updateFilters({ 
                    from: e.target.value || null,
                    period: null 
                  })}
                  className="flex-1 h-9 px-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="date"
                  value={currentFilters.to || ""}
                  onChange={(e) => updateFilters({ 
                    to: e.target.value || null,
                    period: null 
                  })}
                  className="flex-1 h-9 px-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Tag Search */}
            <div className="space-y-2 md:col-span-2 lg:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                Поиск по тегам
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Введите название тега..."
                  className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Popular Tags */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              {tagSearch ? "Результаты поиска" : "Популярные теги"}
            </label>
            <div className="flex flex-wrap gap-2">
              {filteredTags.length > 0 ? (
                filteredTags.slice(0, 15).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      updateFilters({ tag: currentFilters.tag === tag ? null : tag });
                      setTagSearch("");
                    }}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-lg transition-all",
                      currentFilters.tag === tag
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    #{tag}
                  </button>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  {tagSearch ? "Теги не найдены" : "Нет популярных тегов"}
                </span>
              )}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Сортировка:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => updateFilters({ sort: null })}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    !currentFilters.sort || currentFilters.sort === "newest"
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Сначала новые
                </button>
                <button
                  onClick={() => updateFilters({ sort: "oldest" })}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    currentFilters.sort === "oldest"
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Сначала старые
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

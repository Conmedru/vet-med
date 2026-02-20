"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Rss, 
  Globe, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  RefreshCw,
  ExternalLink,
  Play,
  Zap,
  Edit2
} from "lucide-react";

interface Source {
  id: string;
  name: string;
  slug: string;
  url: string;
  adapterType: string;
  isActive: boolean;
  scrapeIntervalMinutes: number;
  lastScrapedAt: string | null;
  articlesCount: number;
  health: "healthy" | "degraded" | "stale" | "broken" | "never" | "inactive";
  healthMessage: string;
  metrics?: {
    duplicateRatio: number | null;
    parseErrorRatio: number | null;
    medianScrapeDurationMs: number | null;
    lastSuccessAt: string | null;
    totalRunsLast7d: number;
  };
}

interface ScrapeResult {
  sourceId: string;
  sourceName: string;
  newArticles: number;
  duplicates: number;
  errors: string[];
}

const adapterIcons: Record<string, typeof Rss> = {
  rss: Rss,
  html: Globe,
  playwright: FileText,
};

const adapterLabels: Record<string, string> = {
  rss: "RSS Feed",
  html: "HTML Scraper",
  playwright: "Playwright",
};

const healthConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  healthy: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  degraded: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
  stale: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  broken: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  never: { icon: Clock, color: "text-stone-400", bg: "bg-stone-100" },
  inactive: { icon: XCircle, color: "text-stone-400", bg: "bg-stone-100" },
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  async function loadSources() {
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load sources:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefreshSource(sourceId: string) {
    setIsRefreshing(sourceId);
    setLastResult(null);
    try {
      const res = await fetch("/api/ingest/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      if (data.results?.[0]) {
        const r = data.results[0] as ScrapeResult;
        if (r.errors.length > 0) {
          setLastResult({ success: false, message: `${r.sourceName}: ${r.errors[0]}` });
        } else {
          setLastResult({ success: true, message: `${r.sourceName}: +${r.newArticles} новых, ${r.duplicates} дубликатов` });
        }
      }
      await loadSources();
    } catch (error) {
      console.error("Failed to refresh source:", error);
      setLastResult({ success: false, message: "Ошибка обновления" });
    } finally {
      setIsRefreshing(null);
    }
  }

  async function handleRefreshAll() {
    setIsRefreshingAll(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/ingest/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.summary) {
        const s = data.summary;
        const errCount = s.totalErrors || 0;
        if (errCount > 0) {
          setLastResult({ 
            success: false, 
            message: `Обновлено ${s.totalSources} источников: +${s.totalNewArticles} новых, ${errCount} ошибок` 
          });
        } else {
          setLastResult({ 
            success: true, 
            message: `Обновлено ${s.totalSources} источников: +${s.totalNewArticles} новых статей` 
          });
        }
      }
      await loadSources();
    } catch (error) {
      console.error("Failed to refresh all sources:", error);
      setLastResult({ success: false, message: "Ошибка обновления всех источников" });
    } finally {
      setIsRefreshingAll(false);
    }
  }

  function formatLastScraped(date: string | null): string {
    if (!date) return "Никогда";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);
    
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч. назад`;
    return d.toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function formatInterval(minutes: number): string {
    if (minutes < 60) return `Каждые ${minutes} мин.`;
    if (minutes < 1440) return `Каждые ${Math.floor(minutes / 60)} ч.`;
    return `Раз в ${Math.floor(minutes / 1440)} дн.`;
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Источники</h1>
          <p className="text-stone-500 mt-1">Управление источниками новостей и мониторинг их состояния</p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={isRefreshingAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70"
        >
          {isRefreshingAll ? (
            <><RefreshCw className="h-4 w-4 animate-spin" /> Обновление...</>
          ) : (
            <><Zap className="h-4 w-4" /> Обновить все</>
          )}
        </button>
      </div>

      {/* Result notification */}
      {lastResult && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          lastResult.success 
            ? "bg-emerald-50 border border-emerald-200" 
            : "bg-red-50 border border-red-200"
        }`}>
          {lastResult.success ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          <span className={lastResult.success ? "text-emerald-800" : "text-red-800"}>
            {lastResult.message}
          </span>
          <button 
            onClick={() => setLastResult(null)}
            className="ml-auto text-stone-400 hover:text-stone-600"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sources Table */}
      <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
          </div>
        ) : sources.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500">Нет источников</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Источник</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Метод</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Последнее обновление</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Интервал</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Статей</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sources.map((source) => {
                  const AdapterIcon = adapterIcons[source.adapterType] || Globe;
                  const { icon: HealthIcon, color, bg } = healthConfig[source.health] || healthConfig.never;
                  
                  return (
                    <tr key={source.id} className="hover:bg-stone-50/50 transition-colors">
                      {/* Source Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
                            <AdapterIcon className="h-5 w-5 text-white flex-shrink-0" />
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{source.name}</p>
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1"
                            >
                              {source.slug}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Method */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-stone-600">
                          {adapterLabels[source.adapterType] || source.adapterType}
                        </span>
                      </td>

                      {/* Health Status */}
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${bg}`}>
                          <HealthIcon className={`h-4 w-4 ${color}`} />
                          <span className={`text-xs font-medium ${color}`}>
                            {source.healthMessage}
                          </span>
                        </div>
                      </td>

                      {/* Last Scraped */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="text-sm text-stone-600 block">
                            {formatLastScraped(source.lastScrapedAt)}
                          </span>
                          {source.metrics?.medianScrapeDurationMs ? (
                            <span className="text-xs text-stone-400 block">
                              median: {Math.round(source.metrics.medianScrapeDurationMs / 1000)}с
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Interval */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-stone-500">
                          {formatInterval(source.scrapeIntervalMinutes)}
                        </span>
                      </td>

                      {/* Articles Count */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-stone-900 block">
                            {source.articlesCount}
                          </span>
                          {source.metrics?.duplicateRatio !== null && source.metrics?.duplicateRatio !== undefined ? (
                            <span className="text-xs text-stone-400 block">
                              dup: {(source.metrics.duplicateRatio * 100).toFixed(1)}%
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/sources/${source.id}`}>
                            <button className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleRefreshSource(source.id)}
                            disabled={!source.isActive || isRefreshing === source.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing === source.id ? "animate-spin" : ""}`} />
                            {isRefreshing === source.id ? "..." : "Обновить"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 p-5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-white flex-shrink-0" />
          </div>
          <div>
            <p className="text-violet-900 font-semibold">Умное расписание</p>
            <p className="text-violet-700 text-sm mt-1">
              Cron запускается каждые 2 часа и обновляет только те источники, чей интервал истёк. 
              Каждый источник имеет свой интервал обновления. Вы также можете обновить любой источник вручную.
            </p>
            <div className="flex gap-4 mt-3 text-xs text-violet-600">
              <span className="flex items-center gap-1">
                <Rss className="h-3.5 w-3.5 flex-shrink-0" /> RSS: быстро, надёжно
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 flex-shrink-0" /> Playwright: для сложных сайтов
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

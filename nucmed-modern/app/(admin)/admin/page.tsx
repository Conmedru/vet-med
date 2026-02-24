"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight, Inbox, RefreshCw } from "lucide-react";
import { useAdminStats } from "@/lib/hooks/use-admin-stats";

interface ScrapeResult {
  success: boolean;
  summary: {
    totalSources: number;
    totalNewArticles: number;
    totalDuplicates: number;
    totalErrors: number;
  };
}

export default function AdminDashboard() {
  const { stats, recentArticles, isLoading, isError, refresh } = useAdminStats();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<ScrapeResult | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await fetch("/api/ingest/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setRefreshResult(data);
      refresh(); // Refresh SWR cache
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const statCards = [
    { label: "Черновики", value: stats.drafts, icon: FileText, gradient: "from-amber-500 to-orange-500", href: "/admin/queue?status=DRAFT" },
    { label: "Запланировано", value: stats.scheduled, icon: Clock, gradient: "from-violet-500 to-purple-500", href: "/admin/calendar" },
    { label: "Опубликовано", value: stats.published, icon: CheckCircle, gradient: "from-emerald-500 to-teal-500", href: "/admin/queue?status=PUBLISHED" },
    { label: "С ошибками", value: stats.failed, icon: AlertCircle, gradient: "from-red-500 to-rose-500", href: "/admin/queue?status=FAILED" },
  ];

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Добро пожаловать</h1>
          <p className="text-stone-500 mt-1">Обзор контента и статистика</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Загрузка..." : "Обновить источники"}
        </button>
      </div>

      {/* Refresh Result */}
      {refreshResult && (
        <div className={`mb-6 p-4 rounded-xl border ${refreshResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className={`font-medium ${refreshResult.success ? "text-emerald-800" : "text-red-800"}`}>
            {refreshResult.success ? "Источники обновлены" : "Ошибка обновления"}
          </p>
          {refreshResult.success && (
            <p className="text-emerald-600 text-sm mt-1">
              Новых статей: <strong>{refreshResult.summary.totalNewArticles}</strong> • 
              Дубликатов: {refreshResult.summary.totalDuplicates} • 
              Источников: {refreshResult.summary.totalSources}
            </p>
          )}
        </div>
      )}

      {/* DB Warning */}
      {isError && !isLoading && (
        <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="text-amber-800 font-medium">База данных не подключена</p>
          <p className="text-amber-600 text-sm mt-1">
            Запустите PostgreSQL и выполните <code className="bg-amber-100 px-1.5 py-0.5 rounded">npx prisma db push</code>
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="group relative bg-white rounded-2xl border border-stone-200/60 p-5 hover:shadow-lg hover:shadow-stone-200/50 transition-all cursor-pointer overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform`} />
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-stone-500">{stat.label}</p>
                <p className="text-3xl font-semibold text-stone-900 mt-1">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Articles */}
      <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">Последние статьи</h2>
          <Link 
            href="/admin/queue" 
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 group"
          >
            Все статьи
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
          </div>
        ) : recentArticles.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Inbox className="h-8 w-8 text-stone-400" />
            </div>
            <p className="text-stone-500 font-medium">Нет статей</p>
            <p className="text-stone-400 text-sm mt-1">Запустите парсер для загрузки контента</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {recentArticles.map((article) => (
              <Link
                key={article.id}
                href={`/admin/articles/${article.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
              >
                <div className="min-w-0 flex-1 mr-4">
                  <p className="font-medium text-stone-900 truncate">
                    {article.title || article.titleOriginal}
                  </p>
                  <p className="text-sm text-stone-400 mt-0.5">
                    {article.source?.name || "—"} • {new Date(article.createdAt).toLocaleDateString("ru")}
                  </p>
                </div>
                <StatusBadge status={article.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    INGESTED: { label: "Новая", bg: "bg-stone-100", text: "text-stone-600" },
    PROCESSING: { label: "Обработка", bg: "bg-blue-50", text: "text-blue-600" },
    DRAFT: { label: "Черновик", bg: "bg-amber-50", text: "text-amber-600" },
    SCHEDULED: { label: "Запланирована", bg: "bg-violet-50", text: "text-violet-600" },
    PUBLISHED: { label: "Опубликована", bg: "bg-emerald-50", text: "text-emerald-600" },
    FAILED: { label: "Ошибка", bg: "bg-red-50", text: "text-red-600" },
    ARCHIVED: { label: "Архив", bg: "bg-stone-100", text: "text-stone-500" },
  };

  const { label, bg, text } = config[status] || { label: status, bg: "bg-stone-100", text: "text-stone-600" };

  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
      {label}
    </span>
  );
}

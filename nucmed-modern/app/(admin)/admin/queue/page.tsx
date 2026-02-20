"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Eye,
  Search,
  X,
  Trash2,
  CheckCheck,
  Circle,
  Image as ImageIcon,
  Filter,
  ArrowUpDown
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ArticleStatus = "INGESTED" | "PROCESSING" | "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED" | "ARCHIVED";

interface Article {
  id: string;
  titleOriginal: string;
  title?: string;
  status: ArticleStatus;
  category?: string;
  source?: { name: string; slug: string };
  createdAt: string;
  publishedAt?: string | null;
  originalPublishedAt?: string | null;
  scheduledAt?: string;
  significanceScore?: number;
  viewedAt?: string | null;
  coverImageUrl?: string | null;
}

const TABS: { status: ArticleStatus | "ALL"; label: string; icon: React.ElementType }[] = [
  { status: "ALL", label: "Все", icon: FileText },
  { status: "INGESTED", label: "В очереди", icon: Clock },
  { status: "PROCESSING", label: "Обработка", icon: RefreshCw },
  { status: "DRAFT", label: "Черновики", icon: FileText },
  { status: "SCHEDULED", label: "Запланированы", icon: Clock },
  { status: "PUBLISHED", label: "Опубликованы", icon: CheckCircle },
  { status: "FAILED", label: "Ошибки", icon: AlertCircle },
];

import { mutate as globalMutate } from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function QueuePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsHook = useSearchParams();

  // Derived state from URL
  const activeTab = (searchParamsHook.get("status") as ArticleStatus | "ALL") || "DRAFT";
  const urlSearch = searchParamsHook.get("search") || "";
  const sourceId = searchParamsHook.get("sourceId") || "";
  const sort = (searchParamsHook.get("sort") === "oldest" ? "oldest" : "newest");

  // Local state for search input (immediate feedback)
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update URL when tab changes
  const handleTabChange = (status: ArticleStatus | "ALL") => {
    const params = new URLSearchParams(window.location.search);
    params.set("status", status);
    // Reset page/skip if we had pagination (currently infinite scroll/load more not fully implemented, just take=50)
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (value: "newest" | "oldest") => {
    const params = new URLSearchParams(window.location.search);
    params.set("sort", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSourceChange = (id: string) => {
    const params = new URLSearchParams(window.location.search);
    if (id && id !== "ALL") {
      params.set("sourceId", id);
    } else {
      params.delete("sourceId");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Debounce search and update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update URL if it differs from current params
      if (searchQuery !== urlSearch) {
        const params = new URLSearchParams(window.location.search);
        if (searchQuery) {
          params.set("search", searchQuery);
        } else {
          params.delete("search");
        }
        router.replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, pathname, router, urlSearch]);

  // Sync search input if URL changes externally (e.g. back button)
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (activeTab !== "ALL") {
      params.set("status", activeTab);
    }
    if (sourceId && sourceId !== "ALL") {
      params.set("sourceId", sourceId);
    }
    if (urlSearch) {
      params.set("search", urlSearch);
    }
    if (sort) {
      params.set("sort", sort);
    }
    params.set("take", "50");
    return `/api/articles?${params.toString()}`;
  }, [activeTab, urlSearch, sourceId, sort]);

  const { data, isLoading, mutate } = useSWR(buildApiUrl(), fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    keepPreviousData: true, // Keep list while loading new tab data
  });

  const { data: sources } = useSWR<any[]>("/api/sources", fetcher);

  const articles: Article[] = data?.items || [];
  const total = data?.total || 0;

  async function processArticle(id: string) {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/articles/${id}/process`, {
        method: "POST",
      });

      if (response.ok) {
        mutate();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message || "Не удалось обработать статью"}`);
      }
    } catch (error) {
      console.error("Process error:", error);
      alert("Ошибка обработки статьи");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDelete() {
    if (!articleToDelete) return;

    const previousData = data;

    // Optimistic update for list
    mutate({
      ...data,
      items: articles.filter(a => a.id !== articleToDelete.id),
      total: Math.max(0, total - 1)
    }, false);

    // Optimistic update for sidebar count
    if (!articleToDelete.viewedAt) {
      globalMutate("/api/articles/unread-count", (current: any) => ({
        count: Math.max(0, (current?.count || 0) - 1)
      }), false);
    }

    setIsDeleting(true);
    setDeleteDialogOpen(false); // Close dialog immediately for better UX

    try {
      const response = await fetch(`/api/articles/${articleToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Статья удалена");
        mutate(); // Revalidate list
        globalMutate("/api/articles/unread-count"); // Revalidate count
      } else {
        toast.error("Не удалось удалить статью");
        mutate(previousData, false); // Rollback list
        globalMutate("/api/articles/unread-count"); // Rollback count
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Ошибка при удалении");
      mutate(previousData, false); // Rollback
      globalMutate("/api/articles/unread-count"); // Rollback
    } finally {
      setIsDeleting(false);
      setArticleToDelete(null);
    }
  }

  async function markAsRead(articleId: string) {
    const previousData = data;
    const article = articles.find(a => a.id === articleId);

    // Optimistic update for list
    const updatedItems = articles.map(a =>
      a.id === articleId ? { ...a, viewedAt: new Date().toISOString() } : a
    );

    mutate({
      ...data,
      items: updatedItems
    }, false);

    // Optimistic update for sidebar count
    if (article && !article.viewedAt) {
      globalMutate("/api/articles/unread-count", (current: any) => ({
        count: Math.max(0, (current?.count || 0) - 1)
      }), false);
    }

    try {
      await fetch("/api/articles/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: [articleId] }),
      });
      // Silent success, revalidate count to be sure
      globalMutate("/api/articles/unread-count");
    } catch (error) {
      console.error("Mark as read error:", error);
      mutate(previousData, false); // Rollback
      globalMutate("/api/articles/unread-count"); // Rollback
    }
  }

  async function markAllAsRead() {
    const previousData = data;
    const unreadInCurrentView = articles.filter(a => !a.viewedAt).length;

    // Optimistic update for list
    const updatedItems = articles.map(a => ({ ...a, viewedAt: new Date().toISOString() }));

    mutate({
      ...data,
      items: updatedItems
    }, false);

    // Optimistic update for sidebar count
    globalMutate("/api/articles/unread-count", (current: any) => ({
      count: Math.max(0, (current?.count || 0) - unreadInCurrentView)
    }), false);

    try {
      await fetch("/api/articles/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      toast.success("Все статьи отмечены как прочитанные");
      mutate(); // Revalidate list
      globalMutate("/api/articles/unread-count"); // Revalidate count
    } catch (error) {
      console.error("Mark all as read error:", error);
      toast.error("Ошибка при отметке статей");
      mutate(previousData, false); // Rollback
      globalMutate("/api/articles/unread-count"); // Rollback
    }
  }

  const unreadCount = articles.filter(a => !a.viewedAt).length;

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Очередь статей</h1>
          <p className="text-stone-500 mt-1">
            {total} {total === 1 ? "статья" : total < 5 ? "статьи" : "статей"}
          </p>
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-all"
            >
              <CheckCheck className="h-4 w-4" />
              Прочитать все ({unreadCount})
            </button>
          )}
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по заголовку и содержимому..."
            className="w-full pl-11 pr-10 py-3 bg-white border border-stone-200 rounded-xl text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Source Filter */}
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <select
            value={sourceId || "ALL"}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
          >
            <option value="ALL">Все источники</option>
            {sources?.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-stone-500" />
          <div className="inline-flex rounded-full border border-stone-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => handleSortChange("newest")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors",
                sort === "newest" ? "bg-emerald-50 text-emerald-700" : "text-stone-600 hover:bg-stone-100"
              )}
              title="Сначала новые"
            >
              Новые
            </button>
            <button
              onClick={() => handleSortChange("oldest")}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-l border-stone-200",
                sort === "oldest" ? "bg-emerald-50 text-emerald-700" : "text-stone-600 hover:bg-stone-100"
              )}
              title="Сначала старые"
            >
              Старые
            </button>
          </div>
        </div>
      </div>

      {urlSearch && (
        <p className="mb-6 text-sm text-stone-500">
          Найдено: {total} {total === 1 ? "статья" : total < 5 ? "статьи" : "статей"} по запросу "{urlSearch}"
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            onClick={() => handleTabChange(tab.status)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all whitespace-nowrap",
              activeTab === tab.status
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mx-auto" />
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/60 p-12 text-center">
          <FileText className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">
            {searchQuery || sourceId ? "Ничего не найдено по вашим критериям" : "Нет статей с выбранным статусом"}
          </p>
          {(searchQuery || sourceId) && (
            <button
              onClick={() => {
                setSearchQuery("");
                handleSourceChange("ALL");
              }}
              className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium text-sm"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden divide-y divide-stone-100">
          {articles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              isProcessing={processingIds.has(article.id)}
              onProcess={() => processArticle(article.id)}
              onDelete={() => {
                setArticleToDelete(article);
                setDeleteDialogOpen(true);
              }}
              onOpen={() => markAsRead(article.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить статью "{articleToDelete?.title || articleToDelete?.titleOriginal}"?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ArticleRow({
  article,
  isProcessing,
  onProcess,
  onDelete,
  onOpen,
}: {
  article: Article;
  isProcessing: boolean;
  onProcess: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const isUnread = !article.viewedAt;

  return (
    <div className={cn(
      "flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors",
      isUnread && "bg-blue-50/50"
    )}>
      {/* Unread indicator */}
      <div className="w-6 flex-shrink-0 mr-2">
        {isUnread && (
          <Circle className="h-2.5 w-2.5 fill-blue-500 text-blue-500" />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={article.status} />
          {article.significanceScore && (
            <span className="text-xs text-stone-400">
              {article.significanceScore}/10
            </span>
          )}
        </div>

        <h3 className={cn(
          "font-medium truncate",
          isUnread ? "text-stone-900 font-semibold" : "text-stone-900"
        )}>
          {article.title || article.titleOriginal}
        </h3>

        <div className="flex items-center gap-3 mt-1 text-sm text-stone-500 flex-wrap">
          {article.source && (
            <span>{article.source.name}</span>
          )}
          {article.category && (
            <span className="text-emerald-600">{article.category}</span>
          )}
          {(() => {
            const siteDate = article.publishedAt || article.createdAt;
            const originalDate = article.originalPublishedAt;

            // Для черновиков показываем оригинальную дату как основную, сайт — второстепенно
            if (article.status === "DRAFT") {
              return (
                <>
                  {originalDate && (
                    <span title="Дата публикации в оригинальном источнике" className="text-stone-600">
                      Оригинал: {new Date(originalDate).toLocaleDateString("ru")}
                    </span>
                  )}
                  <span title="Дата создания/публикации на сайте" className="text-stone-500">
                    На сайте: {new Date(siteDate).toLocaleDateString("ru")}
                  </span>
                </>
              );
            }

            // Для остальных: на сайте + (если есть) оригинал
            return (
              <>
                <span title="Дата публикации на сайте" className="text-stone-600">
                  На сайте: {new Date(siteDate).toLocaleDateString("ru")}
                </span>
                {originalDate && (
                  <span title="Дата публикации в оригинальном источнике" className="text-stone-500">
                    Оригинал: {new Date(originalDate).toLocaleDateString("ru")}
                  </span>
                )}
              </>
            );
          })()}
          {article.coverImageUrl ? (
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-xs font-medium" title="Есть обложка">
              <ImageIcon className="h-3 w-3" />
              <span>Обложка</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-stone-400 opacity-50" title="Нет обложки">
              <ImageIcon className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {(article.status === "INGESTED" || article.status === "FAILED") && (
          <button
            onClick={onProcess}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm rounded-lg font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-70"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Обработка...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {article.status === "FAILED" ? "Повторить" : "Обработать"}
              </>
            )}
          </button>
        )}

        <Link href={`/admin/articles/${article.id}`} onClick={onOpen}>
          <button className="flex items-center gap-2 px-3 py-2 bg-stone-100 text-stone-700 text-sm rounded-lg font-medium hover:bg-stone-200 transition-all">
            <Eye className="h-4 w-4" />
            Открыть
          </button>
        </Link>

        <button
          onClick={onDelete}
          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          title="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ArticleStatus }) {
  const config: Record<ArticleStatus, { label: string; className: string }> = {
    INGESTED: { label: "Новая", className: "bg-gray-100 text-gray-700" },
    PROCESSING: { label: "Обработка", className: "bg-blue-100 text-blue-700" },
    DRAFT: { label: "Черновик", className: "bg-yellow-100 text-yellow-700" },
    SCHEDULED: { label: "Запланирована", className: "bg-purple-100 text-purple-700" },
    PUBLISHED: { label: "Опубликована", className: "bg-green-100 text-green-700" },
    FAILED: { label: "Ошибка", className: "bg-red-100 text-red-700" },
    ARCHIVED: { label: "Архив", className: "bg-gray-100 text-gray-500" },
  };

  const { label, className } = config[status];

  return (
    <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", className)}>
      {label}
    </span>
  );
}

import useSWR from "swr";
import { useEffect, useState } from "react";

interface Stats {
  drafts: number;
  scheduled: number;
  published: number;
  failed: number;
  ingested: number;
}

interface Article {
  id: string;
  title?: string;
  titleOriginal: string;
  status: string;
  createdAt: string;
  source?: { name: string };
}

interface AdminStatsResponse {
  stats: Stats;
  recentArticles: Article[];
}

const CACHE_KEY = "admin_stats_cache";
const CACHE_TTL = 60000; // 1 minute

function getCache(): AdminStatsResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache(data: AdminStatsResponse): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore localStorage errors
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  setCache(data);
  return data;
};

export function useAdminStats() {
  const [fallback, setFallback] = useState<AdminStatsResponse | null>(null);

  useEffect(() => {
    setFallback(getCache());
  }, []);

  const { data, error, isLoading, mutate } = useSWR<AdminStatsResponse>(
    "/api/admin/stats",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000,
      refreshInterval: 60000, // Refresh every minute
      fallbackData: fallback ?? undefined,
    }
  );

  const effectiveData = data ?? fallback;
  const showLoading = isLoading && !effectiveData;

  return {
    stats: effectiveData?.stats ?? { drafts: 0, scheduled: 0, published: 0, failed: 0, ingested: 0 },
    recentArticles: effectiveData?.recentArticles ?? [],
    isLoading: showLoading,
    isError: !!error,
    refresh: mutate,
  };
}

// Generic fetcher hook for articles with caching
export function useArticles(status?: string, take: number = 20) {
  const url = status 
    ? `/api/articles?status=${status}&take=${take}`
    : `/api/articles?take=${take}`;

  const cacheKey = `articles_cache_${url}`;
  const [fallback, setFallback] = useState<{ items: Article[]; total: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setFallback(data);
        }
      }
    } catch {
      // Ignore
    }
  }, [cacheKey]);

  const { data, error, isLoading, mutate } = useSWR(
    url,
    async (u: string) => {
      const res = await fetch(u);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
      } catch {
        // Ignore
      }
      return result;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      fallbackData: fallback ?? undefined,
    }
  );

  const effectiveData = data ?? fallback;

  return {
    articles: effectiveData?.items ?? [],
    total: effectiveData?.total ?? 0,
    isLoading: isLoading && !effectiveData,
    isError: !!error,
    refresh: mutate,
  };
}

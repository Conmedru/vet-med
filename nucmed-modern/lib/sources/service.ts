import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SourceUpdateInput } from "@/lib/schemas/source";

export type SourceHealthStatus = "healthy" | "degraded" | "stale" | "broken" | "inactive";

export interface SourceHealthMetrics {
  duplicateRatio: number | null;
  parseErrorRatio: number | null;
  medianScrapeDurationMs: number | null;
  lastSuccessAt: string | null;
  totalRunsLast7d: number;
}

export interface SourceListItem {
  id: string;
  name: string;
  slug: string;
  url: string;
  adapterType: string;
  isActive: boolean;
  scrapeIntervalMinutes: number;
  lastScrapedAt: Date | null;
  articlesCount: number;
  health: SourceHealthStatus;
  healthMessage: string;
  metrics: SourceHealthMetrics;
  createdAt: Date;
}

function readNumberField(metadata: Prisma.JsonValue, key: string): number {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return 0;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readDuration(metadata: Prisma.JsonValue): number | null {
  const duration = readNumberField(metadata, "durationMs");
  return duration > 0 ? duration : null;
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return Math.round(sorted[middle]);
}

function getConfigVersion(config: Prisma.JsonValue): number {
  if (!config || typeof config !== "object" || Array.isArray(config)) return 1;
  const value = (config as Record<string, unknown>).version;
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  return 1;
}

function deriveHealthStatus(params: {
  isActive: boolean;
  scrapeIntervalMinutes: number;
  lastSuccessAt: Date | null;
  parseErrorRatio: number | null;
}): { health: SourceHealthStatus; healthMessage: string } {
  const { isActive, scrapeIntervalMinutes, lastSuccessAt, parseErrorRatio } = params;

  if (!isActive) {
    return { health: "inactive", healthMessage: "Отключен" };
  }

  if (!lastSuccessAt) {
    return { health: "broken", healthMessage: "Нет успешных запусков" };
  }

  const minutesSinceSuccess = Math.floor((Date.now() - lastSuccessAt.getTime()) / 1000 / 60);
  if (minutesSinceSuccess > scrapeIntervalMinutes * 2) {
    return {
      health: "stale",
      healthMessage: `Не обновлялся ${Math.floor(minutesSinceSuccess / 60)} ч.`,
    };
  }

  if (parseErrorRatio !== null && parseErrorRatio >= 0.3) {
    return {
      health: "degraded",
      healthMessage: "Повышенный уровень ошибок",
    };
  }

  return { health: "healthy", healthMessage: "Работает нормально" };
}

export async function getSourceById(id: string) {
  return prisma.source.findUnique({ where: { id } });
}

export async function updateSourceById(id: string, input: SourceUpdateInput) {
  const existing = await prisma.source.findUnique({
    where: { id },
    select: { id: true, adapterConfig: true },
  });

  if (!existing) {
    return null;
  }

  const currentVersion = getConfigVersion(existing.adapterConfig as Prisma.JsonValue);
  const requestedVersion =
    typeof (input.adapterConfig as Record<string, unknown>).version === "number"
      ? Number((input.adapterConfig as Record<string, unknown>).version)
      : undefined;

  const nextVersion = requestedVersion && requestedVersion > 0 ? requestedVersion : currentVersion + 1;
  const normalizedAdapterConfig = {
    ...input.adapterConfig,
    version: nextVersion,
  };

  return prisma.source.update({
    where: { id },
    data: {
      name: input.name,
      url: input.url,
      adapterType: input.adapterType,
      adapterConfig: normalizedAdapterConfig,
      isActive: input.isActive,
      scrapeIntervalMinutes: input.scrapeIntervalMinutes,
    },
  });
}

export async function getSourcesWithHealth(): Promise<SourceListItem[]> {
  const [sources, logs] = await Promise.all([
    prisma.source.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        action: "ingest.source_run",
        entityType: "source",
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        entityId: true,
        success: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 2000,
    }),
  ]);

  const logsBySource = new Map<string, typeof logs>();
  for (const log of logs) {
    if (!log.entityId) continue;
    const bucket = logsBySource.get(log.entityId) || [];
    bucket.push(log);
    logsBySource.set(log.entityId, bucket);
  }

  return sources.map((source) => {
    const sourceLogs = logsBySource.get(source.id) || [];
    const successLogs = sourceLogs.filter((entry) => entry.success);

    const totalFetched = sourceLogs.reduce(
      (sum, entry) => sum + readNumberField(entry.metadata as Prisma.JsonValue, "totalFetched"),
      0
    );
    const duplicateCount = sourceLogs.reduce(
      (sum, entry) => sum + readNumberField(entry.metadata as Prisma.JsonValue, "duplicates"),
      0
    );

    const duplicateRatio = totalFetched > 0 ? Number((duplicateCount / totalFetched).toFixed(3)) : null;
    const parseErrorRatio =
      sourceLogs.length > 0
        ? Number(((sourceLogs.length - successLogs.length) / sourceLogs.length).toFixed(3))
        : null;

    const durations = sourceLogs
      .map((entry) => readDuration(entry.metadata as Prisma.JsonValue))
      .filter((value): value is number => value !== null);

    const medianScrapeDurationMs = calculateMedian(durations);
    const lastSuccessAt = successLogs[0]?.createdAt || null;

    const derivedHealth = deriveHealthStatus({
      isActive: source.isActive,
      scrapeIntervalMinutes: source.scrapeIntervalMinutes,
      lastSuccessAt,
      parseErrorRatio,
    });

    return {
      id: source.id,
      name: source.name,
      slug: source.slug,
      url: source.url,
      adapterType: source.adapterType,
      isActive: source.isActive,
      scrapeIntervalMinutes: source.scrapeIntervalMinutes,
      lastScrapedAt: source.lastScrapedAt,
      articlesCount: source._count.articles,
      health: derivedHealth.health,
      healthMessage: derivedHealth.healthMessage,
      metrics: {
        duplicateRatio,
        parseErrorRatio,
        medianScrapeDurationMs,
        lastSuccessAt: lastSuccessAt ? lastSuccessAt.toISOString() : null,
        totalRunsLast7d: sourceLogs.length,
      },
      createdAt: source.createdAt,
    };
  });
}

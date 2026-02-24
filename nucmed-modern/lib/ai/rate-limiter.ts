/**
 * Rate Limiter for Replicate API
 * Implements token bucket algorithm with persistence via database
 */

import { prisma } from "@/lib/prisma";

interface RateLimitConfig {
  maxTokensPerMinute: number;
  maxTokensPerHour: number;
  maxTokensPerDay: number;
  costPerToken: number; // USD
  maxDailySpend: number; // USD
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokensPerMinute: 100000,
  maxTokensPerHour: 500000,
  maxTokensPerDay: 2000000,
  costPerToken: 0.0001, // Rough estimate for Replicate
  maxDailySpend: 10, // $10/day max
};

interface UsageRecord {
  minute: number;
  hour: number;
  day: number;
  lastReset: {
    minute: Date;
    hour: Date;
    day: Date;
  };
}

let usageCache: UsageRecord | null = null;

async function getUsage(): Promise<UsageRecord> {
  if (usageCache) {
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60000);
    const hourAgo = new Date(now.getTime() - 3600000);
    const dayAgo = new Date(now.getTime() - 86400000);

    // Reset counters if time windows have passed
    if (usageCache.lastReset.minute < minuteAgo) {
      usageCache.minute = 0;
      usageCache.lastReset.minute = now;
    }
    if (usageCache.lastReset.hour < hourAgo) {
      usageCache.hour = 0;
      usageCache.lastReset.hour = now;
    }
    if (usageCache.lastReset.day < dayAgo) {
      usageCache.day = 0;
      usageCache.lastReset.day = now;
    }

    return usageCache;
  }

  // Load from database
  const config = await prisma.systemConfig.findUnique({
    where: { key: "replicate_usage" },
  });

  const now = new Date();
  
  if (config?.value) {
    try {
      const data = JSON.parse(config.value as string);
      usageCache = {
        minute: data.minute || 0,
        hour: data.hour || 0,
        day: data.day || 0,
        lastReset: {
          minute: new Date(data.lastReset?.minute || now),
          hour: new Date(data.lastReset?.hour || now),
          day: new Date(data.lastReset?.day || now),
        },
      };
      return getUsage(); // Recurse to apply resets
    } catch {
      // Invalid data, reset
    }
  }

  usageCache = {
    minute: 0,
    hour: 0,
    day: 0,
    lastReset: { minute: now, hour: now, day: now },
  };

  return usageCache;
}

async function saveUsage(): Promise<void> {
  if (!usageCache) return;

  await prisma.systemConfig.upsert({
    where: { key: "replicate_usage" },
    create: {
      key: "replicate_usage",
      value: JSON.stringify(usageCache),
    },
    update: {
      value: JSON.stringify(usageCache),
    },
  });
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  usage: {
    minute: number;
    hour: number;
    day: number;
    estimatedCost: number;
  };
  limits: {
    minute: number;
    hour: number;
    day: number;
    maxDailySpend: number;
  };
}

export async function checkRateLimit(
  estimatedTokens: number,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const usage = await getUsage();

  const estimatedCost = usage.day * cfg.costPerToken;

  const result: RateLimitResult = {
    allowed: true,
    usage: {
      minute: usage.minute,
      hour: usage.hour,
      day: usage.day,
      estimatedCost,
    },
    limits: {
      minute: cfg.maxTokensPerMinute,
      hour: cfg.maxTokensPerHour,
      day: cfg.maxTokensPerDay,
      maxDailySpend: cfg.maxDailySpend,
    },
  };

  // Check limits
  if (usage.minute + estimatedTokens > cfg.maxTokensPerMinute) {
    result.allowed = false;
    result.reason = `Minute limit exceeded (${usage.minute}/${cfg.maxTokensPerMinute})`;
    return result;
  }

  if (usage.hour + estimatedTokens > cfg.maxTokensPerHour) {
    result.allowed = false;
    result.reason = `Hour limit exceeded (${usage.hour}/${cfg.maxTokensPerHour})`;
    return result;
  }

  if (usage.day + estimatedTokens > cfg.maxTokensPerDay) {
    result.allowed = false;
    result.reason = `Daily limit exceeded (${usage.day}/${cfg.maxTokensPerDay})`;
    return result;
  }

  const projectedCost = (usage.day + estimatedTokens) * cfg.costPerToken;
  if (projectedCost > cfg.maxDailySpend) {
    result.allowed = false;
    result.reason = `Daily spend limit exceeded ($${estimatedCost.toFixed(2)}/$${cfg.maxDailySpend})`;
    return result;
  }

  return result;
}

export async function recordUsage(tokens: number): Promise<void> {
  const usage = await getUsage();
  
  usage.minute += tokens;
  usage.hour += tokens;
  usage.day += tokens;

  await saveUsage();
}

export async function getUsageStats(): Promise<RateLimitResult["usage"] & RateLimitResult["limits"]> {
  const usage = await getUsage();
  const cfg = DEFAULT_CONFIG;

  return {
    minute: usage.minute,
    hour: usage.hour,
    day: usage.day,
    estimatedCost: usage.day * cfg.costPerToken,
    ...cfg,
  };
}

export async function resetUsage(scope: "minute" | "hour" | "day" | "all"): Promise<void> {
  const usage = await getUsage();
  const now = new Date();

  if (scope === "all" || scope === "minute") {
    usage.minute = 0;
    usage.lastReset.minute = now;
  }
  if (scope === "all" || scope === "hour") {
    usage.hour = 0;
    usage.lastReset.hour = now;
  }
  if (scope === "all" || scope === "day") {
    usage.day = 0;
    usage.lastReset.day = now;
  }

  await saveUsage();
}

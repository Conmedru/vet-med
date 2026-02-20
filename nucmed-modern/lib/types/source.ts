/**
 * News source type
 */
export interface Source {
  id: string;
  name: string;
  slug: string;
  url: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  isActive: boolean;
  scrapeIntervalMinutes: number;
  lastScrapedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Minimal source info for display
 */
export interface SourceInfo {
  id: string;
  name: string;
  slug: string;
}

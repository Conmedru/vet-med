/**
 * UTM-метки наших каналов. Единая схема — чтобы в отчёте «Метки UTM» каналы складывались
 * в одну таблицу (общая с onco-compass).
 * Внутренние ссылки сайта метками не размечать: новая метка начинает новый визит.
 */

export interface Utm {
  source: string;
  medium: string;
  campaign: string;
}

export function withUtm(url: string, utm: Utm): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", utm.source);
  u.searchParams.set("utm_medium", utm.medium);
  u.searchParams.set("utm_campaign", utm.campaign);
  return u.toString();
}

export const digestUtm = (digestId: string): Utm => ({ source: "digest", medium: "email", campaign: digestId });
export const NOTIFICATION_UTM: Utm = { source: "notification", medium: "email", campaign: "new-article" };
export const TELEGRAM_UTM: Utm = { source: "telegram", medium: "social", campaign: "channel-post" };

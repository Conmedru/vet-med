import * as cheerio from "cheerio";

/**
 * Event sources from the client ТЗ (п. 11). Each scraper returns upcoming and recent events;
 * dates are calendar days stored as UTC midnight.
 */

export interface ScrapedEvent {
  externalId: string;
  title: string;
  eventDate: Date;
  endDate: Date | null;
  location: string | null;
  isOnline: boolean;
  linkUrl: string | null;
  organizer: string;
  description: string | null;
}

export interface EventScraper {
  sourceType: string;
  name: string;
  scrape: () => Promise<ScrapedEvent[]>;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(40_000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

/** "2026-11-12" or "2026-11-12T10:00:00+0300" → UTC midnight of that calendar day */
function toDay(value: string | null | undefined): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function clean(text: string | null | undefined): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

function htmlToText(html: string | null | undefined, maxLength = 1000): string | null {
  if (!html) return null;
  const text = clean(cheerio.load(html).text());
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/** Absolute http(s) URL or null: scraped hrefs are rendered as links, so other schemes are dropped */
function safeUrl(url: string | null | undefined, base?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, base);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const currentYear = () => new Date().getUTCFullYear();

// zooinform.ru — list of industry events; annual holidays ("ежегодно") are skipped,
// memorable dates come from lib/vet-dates.ts
const zooinform: EventScraper = {
  sourceType: "zooinform",
  name: "Zooinform",
  async scrape() {
    const events: ScrapedEvent[] = [];
    for (const year of [currentYear(), currentYear() + 1]) {
      const $ = cheerio.load(await fetchHtml(`https://zooinform.ru/meropriyatiya-i-sobytiya/?zcal_year=${year}`));
      $(".zcal-ev").each((_, el) => {
        const item = $(el);
        const chips = item.find(".zcal-chip").map((__, c) => clean($(c).text())).get();
        if (chips.includes("ежегодно")) return;

        const titleLink = item.find(".zcal-ev-title a").first();
        const pageUrl = safeUrl(titleLink.attr("href"), "https://zooinform.ru");
        const eventDate = toDay(item.attr("data-start"));
        const title = clean(titleLink.text());
        if (!pageUrl || !eventDate || !title) return;

        const siteUrl = safeUrl(item.find("a.zcal-btn--site").attr("href"));
        events.push({
          externalId: pageUrl,
          title,
          eventDate,
          endDate: toDay(item.attr("data-end")),
          location: null,
          isOnline: false,
          linkUrl: siteUrl || pageUrl,
          organizer: siteUrl ? hostname(siteUrl) : "zooinform.ru",
          description: null,
        });
      });
    }
    return events;
  },
};

// expomap.ru — exhibitions on animals & veterinary, schema.org Event JSON-LD, paginated (?page=N)
const expomap: EventScraper = {
  sourceType: "expomap",
  name: "Expomap",
  async scrape() {
    const events = new Map<string, ScrapedEvent>();
    for (const year of [currentYear(), currentYear() + 1]) {
      for (let page = 1; page <= 20; page++) {
        const url = `https://expomap.ru/expo/theme/zhivotnyie-veterinariya/${year}/${page > 1 ? `?page=${page}` : ""}`;
        const $ = cheerio.load(await fetchHtml(url));
        let added = 0;
        $('script[type="application/ld+json"]').each((_, el) => {
          let data: Record<string, any>;
          try {
            data = JSON.parse($(el).text());
          } catch {
            return;
          }
          const eventUrl = safeUrl(data?.url, "https://expomap.ru");
          if (data?.["@type"] !== "Event" || !eventUrl || events.has(eventUrl)) return;
          const eventDate = toDay(data.startDate);
          if (!eventDate || !data.name) return;

          const address = data.location?.address || {};
          events.set(eventUrl, {
            externalId: eventUrl,
            title: clean(data.name),
            eventDate,
            endDate: toDay(data.endDate),
            location: [address.addressLocality, address.addressCountry].filter(Boolean).join(", ") || null,
            isOnline: false,
            linkUrl: eventUrl,
            organizer: clean(data.organizer?.name) || "expomap.ru",
            description: htmlToText(data.description),
          });
          added++;
        });
        // Every page repeats a couple of featured events: stop when nothing new appears
        if (added === 0) break;
      }
    }
    return [...events.values()];
  },
};

// proplan.ru — Purina PRO PLAN events for vets; data is a JSON array in the :events attribute
const proplan: EventScraper = {
  sourceType: "proplan",
  name: "PRO PLAN",
  async scrape() {
    const pageUrl = "https://www.proplan.ru/vet/events";
    const $ = cheerio.load(await fetchHtml(pageUrl));
    const raw = $("events-filter").attr(":events");
    if (!raw) throw new Error("PRO PLAN: events data not found");

    const items = JSON.parse(raw) as Array<{
      name: string;
      address: string | null;
      city: string | null;
      description: string | null;
      date_start: string | null;
      date_finish: string | null;
      link: string | null;
      type: string;
    }>;

    return items.flatMap((item) => {
      const eventDate = toDay(item.date_start);
      if (!eventDate || !item.name) return [];
      const link = safeUrl(item.link, pageUrl);
      return [
        {
          externalId: link || `${item.name}|${item.date_start}|${item.city || ""}`,
          title: clean(item.name),
          eventDate,
          endDate: toDay(item.date_finish),
          location: [item.city, item.address].filter(Boolean).join(", ") || null,
          isOnline: item.type === "online",
          linkUrl: link || pageUrl,
          organizer: "PRO PLAN",
          description: htmlToText(item.description),
        },
      ];
    });
  },
};

// avzvet.ru — АВЗ conferences and webinars; dates are "DD" + "MM.YY"
const avzvet: EventScraper = {
  sourceType: "avzvet",
  name: "АВЗ",
  async scrape() {
    const base = "https://avzvet.ru";
    const $ = cheerio.load(await fetchHtml(`${base}/consult/schedule/`));
    const events: ScrapedEvent[] = [];
    $(".events-list-item").each((_, el) => {
      const item = $(el);
      const day = clean(item.find(".events-list-date .day").text());
      const [month, year] = clean(item.find(".events-list-date .month-year").text()).split(".");
      const link = item.find(".events-list-name a").first();
      const href = link.attr("href");
      const title = clean(link.text());
      if (!href || !title || !/^\d+$/.test(day) || !month || !year) return;

      const eventDate = new Date(Date.UTC(2000 + Number(year), Number(month) - 1, Number(day)));
      const place = clean(item.find(".events-list-place").text()).replace(/,?\s*\d{1,2}:\d{2}$/, "").replace(/^,\s*/, "");
      const url = safeUrl(href, base);
      if (!url) return;
      events.push({
        externalId: url,
        title,
        eventDate,
        endDate: null,
        location: place || null,
        isOnline: /вебинар|онлайн/i.test(title) || !place,
        linkUrl: url,
        organizer: "АВЗ",
        description: null,
      });
    });
    return events;
  },
};

// avc.vet — conferences and courses of «АВК», schema.org microdata
const avc: EventScraper = {
  sourceType: "avc",
  name: "АВК",
  async scrape() {
    const base = "https://avc.vet";
    const $ = cheerio.load(await fetchHtml(`${base}/events/`));
    const events: ScrapedEvent[] = [];
    $('[itemtype="http://schema.org/Event"]').each((_, el) => {
      const item = $(el);
      const eventDate = toDay(item.find('[itemprop="startDate"]').attr("content"));
      const title = clean(item.find('[itemprop="name"]').first().text());
      const href = item.find('a[itemprop="url"]').attr("href");
      if (!eventDate || !title || !href) return;

      const url = safeUrl(href, base);
      if (!url) return;
      const city = clean(item.find('[itemprop="addressLocality"]').attr("content") || item.find('[itemprop="addressLocality"]').text());
      const venue = clean(item.find('[itemprop="location"] meta[itemprop="name"]').attr("content"));
      events.push({
        externalId: url,
        title,
        eventDate,
        endDate: toDay(item.find('meta[itemprop="endDate"]').attr("content")),
        location: [city, venue].filter(Boolean).join(", ") || null,
        isOnline: !city,
        linkUrl: url,
        organizer: "АВК",
        description: htmlToText(item.find(".actual-list__content").html(), 600),
      });
    });
    return events;
  },
};

export const EVENT_SCRAPERS: EventScraper[] = [zooinform, expomap, proplan, avzvet, avc];

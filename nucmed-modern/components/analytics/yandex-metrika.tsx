"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
  }
}

const METRIKA_ID = 114041065;

/**
 * Yandex Metrika counter of con-vet.ru (client, 2026-11-03), as in onco-compass.
 * Public site only: the admin is not recorded by Webvisor. Next.js changes pages without a reload,
 * so every later page is sent as a hit — otherwise Metrika counts only the first page of a visit.
 */
export function YandexMetrika() {
  const pathname = usePathname();
  const previousUrl = useRef<string | null>(null);

  useEffect(() => {
    if (window.ym) return;
    // Official snippet: calls are queued until tag.js loads
    const ym = ((...args: unknown[]) => {
      (ym.a = ym.a || []).push(args);
    }) as NonNullable<Window["ym"]>;
    ym.l = Date.now();
    window.ym = ym;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;
    document.head.appendChild(script);

    window.ym(METRIKA_ID, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  }, []);

  useEffect(() => {
    const url = location.href;
    if (previousUrl.current && previousUrl.current !== url) {
      window.ym?.(METRIKA_ID, "hit", url, { referer: previousUrl.current, title: document.title });
    }
    previousUrl.current = url;
  }, [pathname]);

  return (
    <noscript>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- tracking pixel */}
        <img src={`https://mc.yandex.ru/watch/${METRIKA_ID}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
      </div>
    </noscript>
  );
}

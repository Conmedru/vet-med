"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
  }
}

const METRIKA_ID = 114041065;

// Pages with tokens in the link (password reset, email confirmation, newsletter settings) or
// personal data: not counted, so neither the token nor the page reaches Metrika
const PRIVATE_PATHS = ["/account", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/newsletter"];
// Only these query parameters reach Metrika; anything else (token, email…) is cut off
const SAFE_PARAMS = ["q", "page", "sort", "period", "tag", "category"];

const isPrivate = (pathname: string) => PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

function cleanUrl(href: string): string {
  const url = new URL(href);
  const params = new URLSearchParams();
  for (const name of SAFE_PARAMS) {
    const value = url.searchParams.get(name);
    if (value) params.set(name, value);
  }
  const query = params.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}

function cleanReferrer(referrer: string): string {
  if (!referrer) return "";
  try {
    // Another site's address is its own business; ours is cleaned like page addresses
    return new URL(referrer).origin === location.origin ? cleanUrl(referrer) : new URL(referrer).origin;
  } catch {
    return "";
  }
}

/**
 * Yandex Metrika counter of con-vet.ru (client, 2026-11-03), as in onco-compass.
 * Public site only: the admin is not recorded by Webvisor; account and auth forms carry
 * ym-hide-content / ym-disable-keys. Next.js changes pages without a reload, so every later
 * page is sent as a hit — otherwise Metrika counts only the first page of a visit.
 */
export function YandexMetrika() {
  const pathname = usePathname();
  const previousUrl = useRef<string | null>(null);

  useEffect(() => {
    if (isPrivate(pathname)) return;
    const url = cleanUrl(location.href);

    if (!window.ym) {
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
        referrer: cleanReferrer(document.referrer),
        url,
        accurateTrackBounce: true,
        trackLinks: true,
      });
    } else if (previousUrl.current !== url) {
      window.ym(METRIKA_ID, "hit", url, { referer: previousUrl.current ?? undefined, title: document.title });
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

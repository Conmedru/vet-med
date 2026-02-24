import type { Metadata } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const notoSans = Noto_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-serif",
  weight: ["400", "500", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vetmed.ru";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VetMed — Ветеринарная медицина: новости и исследования",
    template: "%s | VetMed",
  },
  description: "Ведущий портал ветеринарной медицины: хирургия, терапия, кардиология, онкология, дерматология и последние достижения в лечении животных.",
  keywords: ["ветеринарная медицина", "новости ветеринарии", "лечение животных", "ветеринарный журнал", "ветеринарные исследования"],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "VetMed",
    title: "VetMed — Ветеринарная медицина",
    description: "Ведущий портал ветеринарной медицины с новостями, исследованиями и клиническими случаями.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VetMed — Ветеринарная медицина",
    description: "Новости и исследования ветеринарной медицины.",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased flex flex-col",
          figtree.variable,
          notoSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

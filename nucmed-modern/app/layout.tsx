import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

// One family for the whole site; --font-serif is kept as an alias for components that still ask for it
const onest = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://con-vet.ru";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CON-VET.ru — ветеринарная медицина: новости и исследования",
    template: "%s | CON-VET.ru",
  },
  description: "Ведущий портал ветеринарной медицины: хирургия, терапия, кардиология, онкология, дерматология и последние достижения в лечении животных.",
  keywords: ["ветеринарная медицина", "новости ветеринарии", "лечение животных", "ветеринарный журнал", "ветеринарные исследования"],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "CON-VET.ru",
    title: "CON-VET.ru — ветеринарная медицина",
    description: "Ведущий портал ветеринарной медицины с новостями, исследованиями и клиническими случаями.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CON-VET.ru — ветеринарная медицина",
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
          onest.variable
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

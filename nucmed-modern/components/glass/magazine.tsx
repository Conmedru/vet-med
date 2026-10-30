import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { formatDateUTC } from "@/lib/utils/date";
import type { DBArticle } from "@/lib/articles";
import { CoverFallback, GLASS, GRADIENTS, Heading, articleDate, articleHref, articleTitle, rubricLabel } from "./kit";
import { RailScroller } from "./rail-scroller";

/**
 * Magazine blocks for the home page: split features (photo half / tinted text half) and
 * full-bleed topic rails. Reference: Expedia Magazine (Refero).
 */

export function SplitFeature({ article, tone, reverse = false, kicker, compact = false }: { article: DBArticle; tone: keyof typeof GRADIENTS; reverse?: boolean; kicker: string; compact?: boolean }) {
  const g = GRADIENTS[tone];
  return (
    <Link href={articleHref(article)} className="group grid grid-cols-1 overflow-hidden rounded-[32px] md:grid-cols-2">
      <div className={`relative min-h-[300px] overflow-hidden bg-[#0b2a33] md:min-h-[460px] ${reverse ? "md:order-2" : ""}`}>
        {!article.coverImageUrl && <CoverFallback />}
        {article.coverImageUrl && (
          <Image src={article.coverImageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        )}
      </div>
      <div className={`flex min-w-0 flex-col justify-center gap-4 bg-gradient-to-br ${compact ? "p-7 md:p-9" : "p-8 md:p-12"} ${g.tile}`}>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full bg-white/70 px-3 py-1 text-[12px] font-semibold ${g.ink}`}>{kicker}</span>
          <span className={`rounded-full border border-white/80 px-3 py-1 text-[12px] font-semibold ${g.ink}`}>{rubricLabel(article)}</span>
        </div>
        <h2 className={`hyphens-auto break-words font-bold leading-[1.12] tracking-[-0.02em] [text-wrap:balance] ${compact ? "line-clamp-5 text-[24px] md:text-[28px]" : "text-[28px] md:text-[38px]"} ${g.ink}`} lang="ru">{articleTitle(article)}</h2>
        {article.excerpt && <p className={`line-clamp-4 text-[16px] leading-relaxed ${g.ink} opacity-80`}>{article.excerpt}</p>}
        <div className={`flex items-center gap-2 text-[14px] font-semibold ${g.ink}`}>
          Читать <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          <span className="ml-auto text-[13px] font-normal opacity-70">{formatDateUTC(articleDate(article), "d MMMM yyyy")}</span>
        </div>
      </div>
    </Link>
  );
}

export function RailCard({ article }: { article: DBArticle }) {
  return (
    <Link href={articleHref(article)} className="group w-[260px] shrink-0 snap-start md:w-[300px]">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-[#0b2a33]">
        {!article.coverImageUrl && <CoverFallback />}
        {article.coverImageUrl && <Image src={article.coverImageUrl} alt="" fill sizes="300px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06222b]/85 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-white/20 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur-md">{rubricLabel(article)}</span>
        <div className="absolute inset-x-3 bottom-3 text-white">
          <h3 className="line-clamp-3 text-[17px] font-bold leading-snug">{articleTitle(article)}</h3>
          <div className="mt-1 text-[12px] text-white/70">{formatDateUTC(articleDate(article), "d MMMM")}</div>
        </div>
      </div>
    </Link>
  );
}

export function Rail({ title, kicker, href, articles }: { title: string; kicker?: string; href: string; articles: DBArticle[] }) {
  if (articles.length === 0) return null;
  return (
    <section>
      <RailScroller header={<Heading kicker={kicker} title={title} href={href} flush />}>
        {articles.map((article) => (
          <RailCard key={article.id} article={article} />
        ))}
        <Link href={href} className={`flex w-[200px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[24px] text-[15px] font-semibold text-[#0e7490] ${GLASS}`}>
          <ArrowRight className="h-6 w-6" /> Смотреть все
        </Link>
      </RailScroller>
    </section>
  );
}


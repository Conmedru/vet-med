/**
 * Новые обложки для статей о питомцах, сделанных до разнообразия пород, кадров и света
 * (клиент 29–30.10.2026: «много золотистых ретриверов, однообразные генерации»).
 * Самые свежие опубликованные статьи о питомцах — их видно на главной и первых страницах разделов.
 * Обложки источника (CEG: превью видео, фото пациентов) не трогаются.
 *
 *   npx tsx scripts/regenerate-covers.ts [--limit 200] [--before 2026-10-30T07:00Z] [--dry-run]
 *
 * Нужны боевые БД, S3 и REPLICATE_API_TOKEN. Одна обложка ≈ $0.03; счёт Replicate общий
 * с онкокомпасом и Neuro 2.0 — большими пачками не запускать.
 */
import { prisma } from "@/lib/prisma";
import { generateAndSaveCover } from "@/lib/ai/process-article";
import { NON_FARM_ANIMAL_SLUGS, FARM_SLUG } from "@/lib/rubrics";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const limit = Number(arg("--limit")) || 200;
const before = new Date(arg("--before") || Date.now());
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      rubrics: { hasSome: NON_FARM_ANIMAL_SLUGS },
      NOT: { rubrics: { has: FARM_SLUG } },
      title: { not: null },
      // Only generated covers made before the change; source previews have another caption
      images: { some: { isCover: true, caption: "AI-generated cover", createdAt: { lt: before } } },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, title: true, excerpt: true, category: true },
  });
  console.log(`${articles.length} covers to regenerate (≈ $${(articles.length * 0.03).toFixed(2)})`);
  if (dryRun) return;

  let done = 0;
  let failed = 0;
  for (const a of articles) {
    try {
      await generateAndSaveCover(a.id, a.title!, a.excerpt || "", a.category || "");
      done++;
    } catch (error) {
      failed++;
      console.warn(`FAILED ${a.id}: ${error instanceof Error ? error.message : error}`);
      if (error instanceof Error && /402|insufficient|credit|billing/i.test(error.message)) {
        console.error("Replicate: нет кредитов — останавливаюсь");
        break;
      }
    }
    if ((done + failed) % 20 === 0) console.log(`[${done + failed}/${articles.length}] ok ${done}, failed ${failed}`);
  }
  console.log(`Done: ${done} regenerated, ${failed} failed`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

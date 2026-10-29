/**
 * Снимает с сайта статьи только о с/х животных (клиент, 2026-10-29: с/х не публикуем).
 * PUBLISHED и SCHEDULED → ARCHIVED с пометкой в processingError — обратимо.
 * Статьи, где кроме с/х есть питомцы или экзоты, остаются: рубрика «С/х» на сайте просто не показывается.
 *
 *   npx tsx scripts/hide-farm-articles.ts [--dry-run]
 *
 * Конвейер новые с/х статьи архивирует сам (lib/ai/process-article.ts); скрипт —
 * для уже опубликованного и после переразметки (scripts/reclassify-rubrics.ts).
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { FARM_SLUG, NON_FARM_ANIMAL_SLUGS } from "../lib/rubrics";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const MARKER = "farm-only: статья только о с/х животных — на сайте не публикуется";

async function main() {
  const where = Prisma.sql`a."status" IN ('PUBLISHED', 'SCHEDULED') AND ${FARM_SLUG} = ANY(a."rubrics") AND NOT (a."rubrics" && ${NON_FARM_ANIMAL_SLUGS}::text[])`;
  const rows = await prisma.$queryRaw<{ status: string; count: bigint }[]>`SELECT a."status", count(*) FROM "articles" a WHERE ${where} GROUP BY a."status"`;
  for (const r of rows) console.log(`${r.status}: ${r.count}`);
  if (dryRun) return;
  const n = await prisma.$executeRaw`UPDATE "articles" a SET "status" = 'ARCHIVED', "scheduledAt" = NULL, "processingError" = ${MARKER}, "updatedAt" = now() WHERE ${where}`;
  console.log(`Archived ${n} farm-only articles`);
}

main().finally(() => prisma.$disconnect());

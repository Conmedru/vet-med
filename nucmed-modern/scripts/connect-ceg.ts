/**
 * Cardiac Education Group (cardiaceducationgroup.org, по запросу клиента 30.10.2026) в регулярный
 * сбор: клинические случаи (кардиология, кошки и собаки) и раздел «Видео» — видеолекции,
 * вебинары и подкасты анонсом со ссылкой на источник. Адаптер — lib/scraper/adapters/ceg.ts.
 * Идемпотентно: создаёт источники или обновляет их настройки.
 *
 *   npx tsx scripts/connect-ceg.ts [--backfill] [--dry-run]
 *
 * --backfill — один раз собрать весь архив (иначе сбор берёт изменения за 30 дней). Собранное
 * обрабатывает cron/process обычным конвейером с проверкой фактов, публикация — по расписанию.
 */
import { prisma } from "@/lib/prisma";
import { ingestSource } from "@/lib/scraper";

const dryRun = process.argv.includes("--dry-run");
const backfill = process.argv.includes("--backfill");

const sources = [
  {
    slug: "ceg-cases",
    name: "Cardiac Education Group — клинические случаи",
    url: "https://cardiaceducationgroup.org/explore/cats/",
    adapterConfig: { version: 1, mode: "cases", sinceDays: 30, language: "en", defaultRubrics: ["clinical-cases", "cardiology"], useSourceCover: true },
  },
  {
    slug: "ceg-media",
    name: "Cardiac Education Group — видео и подкасты",
    url: "https://cardiaceducationgroup.org/podcast-webinar/",
    adapterConfig: { version: 1, mode: "media", sinceDays: 30, language: "en", defaultRubrics: ["video"], useSourceCover: true },
  },
];

async function main() {
  for (const s of sources) {
    const existing = await prisma.source.findUnique({ where: { slug: s.slug } });
    if (dryRun) {
      console.log(`${existing ? "UPDATE" : "CREATE"}: ${s.slug}`);
      continue;
    }
    const data = { name: s.name, url: s.url, adapterType: "ceg", adapterConfig: s.adapterConfig, isActive: true };
    const source = existing
      ? await prisma.source.update({ where: { id: existing.id }, data })
      : await prisma.source.create({ data: { slug: s.slug, ...data } });
    console.log(`${existing ? "UPDATED" : "CREATED"}: ${s.slug}`);

    if (backfill) {
      await prisma.source.update({ where: { id: source.id }, data: { adapterConfig: { ...s.adapterConfig, sinceDays: 3650 } } });
      try {
        const result = await ingestSource(source.id, { autoProcess: false });
        console.log(`  backfill: ${result.totalFetched} fetched, ${result.newArticles} new, ${result.duplicates} duplicates, ${result.errors.length} errors`);
      } finally {
        await prisma.source.update({ where: { id: source.id }, data: { adapterConfig: s.adapterConfig } });
      }
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

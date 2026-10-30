/**
 * Cardiac Education Group (cardiaceducationgroup.org, по запросу клиента 30.10.2026) в регулярный
 * сбор: клинические случаи (кардиология, кошки и собаки) и раздел «Видео» — видеолекции,
 * вебинары и подкасты анонсом со ссылкой на источник. Адаптер — lib/scraper/adapters/ceg.ts.
 * Идемпотентно: создаёт источники или обновляет их настройки.
 *
 *   npx tsx scripts/connect-ceg.ts [--backfill] [--dry-run]
 *
 * --backfill — окно 10 лет: весь архив соберёт ближайший плановый сбор на сервере (там настроен
 * S3 для превью). После него запустить ещё раз без флага — окно вернётся к 30 дням. Собранное
 * обрабатывает cron/process обычным конвейером с проверкой фактов, публикация — по расписанию.
 */
import { prisma } from "@/lib/prisma";

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
    // Backfill: the archive is collected by the next scheduled scrape on the server (S3 for the
    // previews is configured there); run again without --backfill afterwards to return to 30 days
    const adapterConfig = backfill ? { ...s.adapterConfig, sinceDays: 3650 } : s.adapterConfig;
    if (dryRun) {
      console.log(`${existing ? "UPDATE" : "CREATE"}: ${s.slug} (sinceDays ${adapterConfig.sinceDays})`);
      continue;
    }
    const data = { name: s.name, url: s.url, adapterType: "ceg", adapterConfig, isActive: true };
    if (existing) await prisma.source.update({ where: { id: existing.id }, data });
    else await prisma.source.create({ data: { slug: s.slug, ...data } });
    console.log(`${existing ? "UPDATED" : "CREATED"}: ${s.slug} (sinceDays ${adapterConfig.sinceDays})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * Журналы из списка клиента без RSS и без DOAJ — через Crossref (по ISSN) и OAI-PMH (OJS),
 * плюс перевод российских журналов на OAI с русскими аннотациями. Идемпотентно: создаёт
 * новые источники и обновляет адаптер существующих.
 *
 *   npx tsx scripts/connect-more-journals.ts [--dry-run]
 *
 * Не подключены: Journal of Veterinary Science (vetsci.org) и International Journal of
 * Veterinary Science (ijvets.com) — аннотации только за защитой от ботов; Актуальные вопросы
 * ветеринарной биологии (avvb.ru) — только PDF номеров; Ветеринарный фармакологический
 * вестник (vfvrn.ru) — сайт не отвечает; Sokoto J Vet Sci — сайт не отвечает.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const crossref = (issn: string, extra: Record<string, unknown> = {}) => ({
  adapterType: "crossref",
  adapterConfig: { version: 1, issn, rows: 40, maxAgeDays: 14, language: "en", ...extra },
});
const oai = (endpoint: string, language: "ru" | "en") => ({
  adapterType: "oai",
  adapterConfig: { version: 1, endpoint, maxAgeDays: 30, language },
});

const journals: { name: string; slug: string; url: string; region?: "ru" | "foreign"; adapterType: string; adapterConfig: Record<string, unknown>; deactivate?: string[] }[] = [
  // Зарубежные — Crossref
  { name: "Veterinary Sciences (MDPI)", slug: "mdpi-vetsci-crossref", url: "https://www.mdpi.com/journal/vetsci", ...crossref("2306-7381"), deactivate: ["mdpi-vetsci"] },
  { name: "Journal of Applied Veterinary Science and Technology", slug: "javest", url: "https://e-journal.unair.ac.id/JAVEST", ...crossref("2716-117X") },
  { name: "German Journal of Veterinary Research", slug: "gjvr", url: "https://www.gjvr.org/", ...crossref("2703-1322", { abstractFromLandingPage: true }) },
  { name: "Veterinary Record Open", slug: "vet-record-open", url: "https://bvajournals.onlinelibrary.wiley.com/journal/20526113", ...crossref("2399-2050", { abstractFromLandingPage: true }) },
  { name: "Revista de la Facultad de Medicina Veterinaria y de Zootecnia", slug: "remevez", url: "https://revistas.unal.edu.co/index.php/remevez", ...crossref("2357-3813", { maxAgeDays: 30 }) },
  { name: "Open Veterinary Science", slug: "open-vet-science", url: "https://www.degruyterbrill.com/journal/key/ovs/html", ...crossref("2544-8951", { maxAgeDays: 30 }) },
  // Зарубежные — OAI-PMH (OJS)
  { name: "Archives of Veterinary Science", slug: "archives-vet-science", url: "https://revistas.ufpr.br/veterinary", ...oai("https://revistas.ufpr.br/veterinary/oai", "en") },

  // Российские — OAI-PMH, русские аннотации
  { name: "Ученые записки Казанской академии ветеринарной медицины им. Н.Э. Баумана", slug: "vetzapiski", url: "https://vetzapiski.ru", region: "ru", ...oai("https://vetzapiski.ru/index.php/vestnik/oai", "ru") },
  { name: "Ветеринария сегодня", slug: "veterinariya-segodnya", url: "https://veterinary.arriah.ru/jour", region: "ru", ...oai("https://veterinary.arriah.ru/jour/oai", "ru") },
  { name: "Международный вестник ветеринарии", slug: "mezhdunarodnyj-vestnik-vet", url: "https://vetjournal.spbguvm.ru/jour", region: "ru", ...oai("https://vetjournal.spbguvm.ru/jour/oai", "ru") },
];

async function main() {
  for (const { deactivate, ...journal } of journals) {
    const existing = await prisma.source.findUnique({ where: { slug: journal.slug } });
    const data = { ...journal, region: journal.region ?? "foreign", isActive: true, scrapeIntervalMinutes: 1440 };
    if (dryRun) {
      console.log(`${existing ? "UPDATE" : "CREATE"}: ${journal.slug} [${journal.adapterType}]`);
    } else if (existing) {
      await prisma.source.update({ where: { id: existing.id }, data: { adapterType: journal.adapterType, adapterConfig: journal.adapterConfig as object, url: journal.url, isActive: true } });
      console.log(`UPDATED: ${journal.slug} → ${journal.adapterType}`);
    } else {
      await prisma.source.create({ data: { ...data, adapterConfig: journal.adapterConfig as object } });
      console.log(`CREATED: ${journal.slug} [${journal.adapterType}]`);
    }
    for (const slug of deactivate ?? []) {
      if (!dryRun) await prisma.source.updateMany({ where: { slug }, data: { isActive: false } });
      console.log(`  deactivated old ${slug}`);
    }
  }
}

main().finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

/**
 * Журналы из списка клиента (Журналы - источники.docx, октябрь 2026).
 * Большинство берём через DOAJ API по ISSN, остальные — через RSS (OJS / сайт журнала).
 * Журналы без живого DOAJ/RSS (Revista FMVZ, Vet Record Open, Open Vet Science, GJVR,
 * Sokoto, IJVets, Medwin, J Vet Sci Korea, Archives of Vet Science, Ветфарм вестник,
 * Казанские уч. записки, АВВБ) сюда не входят.
 *
 * Запуск: npx tsx scripts/add-journal-sources.ts
 */

const prisma = new PrismaClient();

// maxAgeDays отсекает архив журнала при первом сборе
const doaj = (issn: string, language: 'en' | 'ru' = 'en') => ({
  adapterType: 'doaj',
  adapterConfig: { version: 1, issn, pageSize: 50, maxAgeDays: 7, language },
});

const rss = (feedUrl: string, language: 'en' | 'ru' = 'en') => ({
  adapterType: 'rss',
  adapterConfig: { version: 1, feedUrl, maxAgeDays: 60, language },
});

const journals = [
  // Зарубежные — DOAJ
  { name: 'Veterinary Medicine: Research and Reports', slug: 'vmrr', url: 'https://www.dovepress.com/veterinary-medicine-research-and-reports-journal', ...doaj('2230-2034') },
  { name: 'Veterinární Medicína', slug: 'vetmed-cz', url: 'https://vetmed.agriculturejournals.cz/', ...doaj('1805-9392') },
  { name: 'Veterinary Medicine and Science', slug: 'vet-med-science', url: 'https://onlinelibrary.wiley.com/journal/20531095', ...doaj('2053-1095') },
  { name: 'BMC Veterinary Research', slug: 'bmc-vet-research', url: 'https://bmcvetres.biomedcentral.com/', ...doaj('1746-6148') },
  { name: 'Veterinary Research', slug: 'veterinary-research', url: 'https://veterinaryresearch.biomedcentral.com/', ...doaj('1297-9716') },
  { name: 'Veterinary Medicine International', slug: 'vet-med-international', url: 'https://onlinelibrary.wiley.com/journal/7461', ...doaj('2042-0048') },
  { name: 'Open Veterinary Journal', slug: 'open-vet-journal', url: 'https://www.openveterinaryjournal.com/', ...doaj('2218-6050') },
  { name: 'Veterinary World', slug: 'veterinary-world', url: 'https://www.veterinaryworld.org/', ...doaj('2231-0916') },
  { name: 'Journal of Advanced Veterinary and Animal Research', slug: 'javar', url: 'https://bdvets.org/JAVAR/', ...doaj('2311-7710') },
  { name: 'International Journal of Veterinary Science and Medicine', slug: 'ijvsm', url: 'https://www.tandfonline.com/journals/tvsm20', ...doaj('2314-4599') },
  { name: 'Archives of Veterinary Medicine', slug: 'archives-vet-med', url: 'https://niv.ns.ac.rs/e-avm/', ...doaj('2683-4138') },
  { name: 'Veterinary Integrative Sciences', slug: 'vet-integrative-sciences', url: 'https://he02.tci-thaijo.org/index.php/vis', ...doaj('2629-9968') },
  { name: 'Slovenian Veterinary Research', slug: 'slovenian-vet-research', url: 'https://journals.uni-lj.si/slovetres/', ...doaj('2385-8761') },
  { name: 'Frontiers in Animal Science', slug: 'frontiers-animal-science', url: 'https://www.frontiersin.org/journals/animal-science', ...doaj('2673-6225') },
  { name: 'Journal of Veterinary and Animal Sciences', slug: 'jvas', url: 'https://www.jvas.in/', ...doaj('2582-0605') },
  { name: 'Veterinary Vaccine', slug: 'veterinary-vaccine', url: 'https://www.sciencedirect.com/journal/veterinary-vaccine', ...doaj('2772-5359') },
  { name: 'Acta Veterinaria Scandinavica', slug: 'acta-vet-scand', url: 'https://actavetscand.biomedcentral.com/', ...doaj('1751-0147') },
  { name: 'Acta Veterinaria (Beograd)', slug: 'acta-veterinaria', url: 'https://www.actaveterinaria.rs/', ...doaj('1820-7448') },
  { name: 'Analecta Veterinaria', slug: 'analecta-veterinaria', url: 'https://revistas.unlp.edu.ar/analecta', ...doaj('1514-2590') },
  { name: 'Archives of Razi Institute', slug: 'archives-razi', url: 'https://archrazi.areeo.ac.ir/', ...doaj('2008-9872') },
  { name: 'Irish Veterinary Journal', slug: 'irish-vet-journal', url: 'https://irishvetjournal.biomedcentral.com/', ...doaj('2046-0481') },
  { name: 'Veterinary Evidence', slug: 'veterinary-evidence', url: 'https://veterinaryevidence.org/', ...doaj('2396-9776') },
  { name: 'Austral Journal of Veterinary Sciences', slug: 'austral-jvs', url: 'https://www.australjvs.cl/', ...doaj('0719-8132') },
  { name: 'Journal of Applied Veterinary Science and Technology', slug: 'javest', url: 'https://e-journal.unair.ac.id/JAVEST', ...doaj('2716-117X') },
  { name: 'Journal of Tropical Animal and Veterinary Science', slug: 'jitro', url: 'https://jurnal.unipa.ac.id/index.php/jipvet', ...doaj('2620-9403') },
  { name: 'Jurnal Medik Veteriner', slug: 'jurnal-medik-veteriner', url: 'https://e-journal.unair.ac.id/JMV', ...doaj('2581-012X') },
  { name: 'Journal of Applied Veterinary Sciences', slug: 'javs-egypt', url: 'https://javs.journals.ekb.eg/', ...doaj('2090-3308') },

  // Зарубежные — RSS
  { name: 'Turkish Journal of Veterinary and Animal Sciences', slug: 'turkish-jvas', url: 'https://journals.tubitak.gov.tr/veterinary/', ...rss('https://journals.tubitak.gov.tr/veterinary/recent.rss') },
  { name: 'Sahel Journal of Veterinary Sciences', slug: 'sahel-jvs', url: 'https://saheljvs.org/index.php/saheljvs', ...rss('https://saheljvs.org/index.php/saheljvs/gateway/plugin/WebFeedGatewayPlugin/rss2') },
  { name: 'Veterinaria (Sarajevo)', slug: 'veterinaria-sarajevo', url: 'https://veterinaria.unsa.ba/journal/index.php/vfs/index', ...rss('https://veterinaria.unsa.ba/journal/index.php/vfs/gateway/plugin/WebFeedGatewayPlugin/rss2') },

  // Российские — DOAJ (аннотации на английском)
  { name: 'Ветеринария сегодня', slug: 'veterinariya-segodnya', url: 'https://veterinary.arriah.ru/jour', region: 'ru', ...doaj('2658-6959') },
  { name: 'Ветеринарная патология', slug: 'vetpat', url: 'http://www.vetpat.ru/', region: 'ru', ...doaj('2949-4826') },
  { name: 'Ветеринария и кормление', slug: 'vetkorm', url: 'http://vetkorm.ru/', region: 'ru', ...doaj('1814-9588') },

  // Российские — RSS (на русском)
  { name: 'Международный вестник ветеринарии', slug: 'mezhdunarodnyj-vestnik-vet', url: 'https://vetjournal.spbguvm.ru/jour', region: 'ru', ...rss('https://vetjournal.spbguvm.ru/jour/gateway/plugin/WebFeedGatewayPlugin/rss2', 'ru') },
];

// Уже подключённые российские источники
const russianExisting = ['vetpalata'];

async function main() {
  for (const journal of journals) {
    const existing = await prisma.source.findUnique({ where: { slug: journal.slug } });
    if (existing) {
      console.log(`SKIP: ${journal.slug} (already exists, id=${existing.id})`);
      continue;
    }
    const created = await prisma.source.create({
      data: { region: 'foreign', isActive: true, scrapeIntervalMinutes: 1440, ...journal },
    });
    console.log(`CREATED: ${created.slug} [${created.adapterType}, ${created.region}]`);
  }

  const updated = await prisma.source.updateMany({
    where: { slug: { in: russianExisting } },
    data: { region: 'ru' },
  });
  console.log(`Marked ${updated.count} existing sources as ru`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

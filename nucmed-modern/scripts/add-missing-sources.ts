import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newSources = [
  {
    name: 'Национальная ветеринарная палата',
    slug: 'vetpalata',
    url: 'https://vetpalata.ru/feed/',
    adapterType: 'rss',
    adapterConfig: { version: 1 },
    isActive: true,
    scrapeIntervalMinutes: 720,
  },
  {
    name: 'Phys.org Veterinary Medicine',
    slug: 'phys-org-vet',
    url: 'https://phys.org/rss-feed/biology-news/veterinary-medicine/',
    adapterType: 'rss',
    adapterConfig: { version: 1 },
    isActive: true,
    scrapeIntervalMinutes: 1440,
  },
  {
    name: 'MDPI Veterinary Sciences',
    slug: 'mdpi-vetsci',
    url: 'https://www.mdpi.com/journal/vetsci',
    adapterType: 'playwright',
    adapterConfig: {
      version: 1,
      listUrl: 'https://www.mdpi.com/journal/vetsci',
      articleSelector: '.article-content',
      linkSelector: 'a.title-is-link',
      titleSelector: 'a.title-is-link',
      contentSelector: '.art-abstract',
      dateSelector: '.pubhistory .pub-date',
      authorSelector: '.sciprofiles-link',
      imageSelector: 'img',
      waitForSelector: '.article-content',
      maxArticles: 10,
      listOnly: true,
    },
    isActive: true,
    scrapeIntervalMinutes: 1440,
  },
  {
    name: 'Wiley Veterinary Record',
    slug: 'wiley-vet-record',
    url: 'https://onlinelibrary.wiley.com/feed/17408261/most-recent',
    adapterType: 'rss',
    adapterConfig: { version: 1 },
    isActive: true,
    scrapeIntervalMinutes: 1440,
  },
  {
    name: 'Frontiers in Veterinary Science',
    slug: 'frontiers-vetsci',
    url: 'https://www.frontiersin.org/journals/veterinary-science/rss',
    adapterType: 'rss',
    adapterConfig: { version: 1 },
    isActive: true,
    scrapeIntervalMinutes: 1440,
  },
  {
    name: 'SCIRP Open Journal of Veterinary Medicine',
    slug: 'scirp-ojvm',
    url: 'https://www.scirp.org/journal/ojvm/',
    adapterType: 'playwright',
    adapterConfig: {
      version: 1,
      listUrl: 'https://www.scirp.org/journal/ojvm/',
      articleSelector: '.article_list li',
      linkSelector: 'a',
      titleSelector: 'a',
      contentSelector: '.abstract',
      waitForSelector: '.article_list',
      maxArticles: 10,
      listOnly: true,
    },
    isActive: true,
    scrapeIntervalMinutes: 1440,
  },
  {
    name: 'Taylor & Francis Animal Nutrition',
    slug: 'tandfonline-rfan',
    url: 'https://www.tandfonline.com/feed/rss/rfan20',
    adapterType: 'rss',
    adapterConfig: { version: 1 },
    isActive: true,
    scrapeIntervalMinutes: 1440,
  },
  {
    name: 'ScienceDirect Animal Nutrition',
    slug: 'sciencedirect-animal-nutrition',
    url: 'https://rss.sciencedirect.com/publication/science/24056545',
    adapterType: 'rss',
    adapterConfig: { version: 1 },
    isActive: true,
    scrapeIntervalMinutes: 1440,
  },
  {
    name: "Today's Veterinary Practice",
    slug: 'todays-vet-practice',
    url: 'https://todaysveterinarypractice.com/tag/peer-reviewed/feed/',
    adapterType: 'rss',
    adapterConfig: { version: 1 },
    isActive: true,
    scrapeIntervalMinutes: 720,
  },
];

async function main() {
  for (const source of newSources) {
    const existing = await prisma.source.findUnique({ where: { slug: source.slug } });
    if (existing) {
      console.log(`SKIP: ${source.slug} (already exists, id=${existing.id})`);
      continue;
    }
    const created = await prisma.source.create({ data: source });
    console.log(`CREATED: ${created.slug} (id=${created.id})`);
  }

  // List all sources
  const all = await prisma.source.findMany({ select: { id: true, slug: true, isActive: true, adapterType: true } });
  console.log('\n=== ALL SOURCES ===');
  all.forEach(s => console.log(`  ${s.slug} | ${s.adapterType} | active=${s.isActive}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

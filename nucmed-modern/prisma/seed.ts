import { ArticleStatus, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ==========================================
  // РЕАЛЬНЫЕ ИСТОЧНИКИ ДЛЯ ПАРСИНГА
  // ==========================================

  // ==========================================
  // CLICKHOUSE CLEANUP (LEGACY SOURCES)
  // ==========================================
  const displayNamesToDeactivate = ['MedicalXpress Neurology', 'Neurology (WNL)'];
  for (const name of displayNamesToDeactivate) {
    try {
      await prisma.source.updateMany({
        where: { name: name },
        data: { isActive: false }
      });
      console.log(`⚠️ Deactivated legacy source: ${name}`);
    } catch (e) {
      // ignore
    }
  }

  // ==========================================
  // РЕАЛЬНЫЕ ИСТОЧНИКИ ДЛЯ ПАРСИНГА (NEUROLOGY)
  // ==========================================

  // 1. Neuroscience News (Verified RSS)
  const neuroscienceNews = await prisma.source.upsert({
    where: { slug: 'neuroscience-news' },
    update: {
      url: 'https://neurosciencenews.com',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://neurosciencenews.com/feed/',
      },
      isActive: true,
    },
    create: {
      name: 'Neuroscience News',
      slug: 'neuroscience-news',
      url: 'https://neurosciencenews.com',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://neurosciencenews.com/feed/',
      },
      isActive: true,
      scrapeIntervalMinutes: 360,
    },
  })
  console.log(`✅ Source: ${neuroscienceNews.name}`)

  // 2. ScienceDaily - Neuroscience (Verified RSS)
  const scienceDaily = await prisma.source.upsert({
    where: { slug: 'sciencedaily-neuro' },
    update: {
      url: 'https://www.sciencedaily.com/news/mind_brain/neuroscience/',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://www.sciencedaily.com/rss/mind_brain/neuroscience.xml',
      },
      isActive: true,
    },
    create: {
      name: 'ScienceDaily Neuroscience',
      slug: 'sciencedaily-neuro',
      url: 'https://www.sciencedaily.com/news/mind_brain/neuroscience/',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://www.sciencedaily.com/rss/mind_brain/neuroscience.xml',
      },
      isActive: true,
      scrapeIntervalMinutes: 360,
    },
  })
  console.log(`✅ Source: ${scienceDaily.name}`)

  // 3. JNNP (BMJ)
  const jnnp = await prisma.source.upsert({
    where: { slug: 'jnnp-bmj' },
    update: {
      adapterConfig: {
        feedUrl: 'https://jnnp.bmj.com/rss/current.xml',
      },
    },
    create: {
      name: 'JNNP (BMJ)',
      slug: 'jnnp-bmj',
      url: 'https://jnnp.bmj.com/',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://jnnp.bmj.com/rss/current.xml',
      },
      isActive: true,
      scrapeIntervalMinutes: 1440,
    },
  })
  console.log(`✅ Source: ${jnnp.name}`)

  // 4. Lancet Neurology (Verified RSS — replaces dead Medscape)
  const lancetNeuro = await prisma.source.upsert({
    where: { slug: 'lancet-neurology' },
    update: {
      url: 'https://www.thelancet.com/journals/laneur',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://www.thelancet.com/rssfeed/laneur_current.xml',
      },
      isActive: true,
    },
    create: {
      name: 'The Lancet Neurology',
      slug: 'lancet-neurology',
      url: 'https://www.thelancet.com/journals/laneur',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://www.thelancet.com/rssfeed/laneur_current.xml',
      },
      isActive: true,
      scrapeIntervalMinutes: 1440,
    },
  })
  console.log(`✅ Source: ${lancetNeuro.name}`)

  // Deactivate old Medscape source if it exists
  try {
    await prisma.source.updateMany({
      where: { slug: 'medscape-neurology' },
      data: { isActive: false },
    });
  } catch (e) { /* ignore */ }

  // 5. Practical Neurology (BMJ) - Verified RSS
  const practicalNeurology = await prisma.source.upsert({
    where: { slug: 'practical-neurology' },
    update: {
      url: 'https://pn.bmj.com/',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://pn.bmj.com/rss/current.xml',
      },
      isActive: true,
    },
    create: {
      name: 'Practical Neurology (BMJ)',
      slug: 'practical-neurology',
      url: 'https://pn.bmj.com/',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://pn.bmj.com/rss/current.xml',
      },
      isActive: true,
      scrapeIntervalMinutes: 1440,
    },
  })
  console.log(`✅ Source: ${practicalNeurology.name}`)

  // 6. European Journal of Neurology (Wiley) - Verified RSS
  const wileyEuro = await prisma.source.upsert({
    where: { slug: 'wiley-euro-neurology' },
    update: {
      url: 'https://onlinelibrary.wiley.com/journal/14681331',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://onlinelibrary.wiley.com/feed/14681331/most-recent',
      },
      isActive: true,
    },
    create: {
      name: 'Euro J of Neurology (Wiley)',
      slug: 'wiley-euro-neurology',
      url: 'https://onlinelibrary.wiley.com/journal/14681331',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://onlinelibrary.wiley.com/feed/14681331/most-recent',
      },
      isActive: true,
      scrapeIntervalMinutes: 1440,
    },
  })
  console.log(`✅ Source: ${wileyEuro.name}`)

  // 7. Frontiers in Neurology (Verified RSS — replaces JS-only Radiopaedia)
  const frontiersNeuro = await prisma.source.upsert({
    where: { slug: 'frontiers-neurology' },
    update: {
      url: 'https://www.frontiersin.org/journals/neurology',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://www.frontiersin.org/journals/neurology/rss',
      },
      isActive: true,
    },
    create: {
      name: 'Frontiers in Neurology',
      slug: 'frontiers-neurology',
      url: 'https://www.frontiersin.org/journals/neurology',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://www.frontiersin.org/journals/neurology/rss',
      },
      isActive: true,
      scrapeIntervalMinutes: 720,
    },
  })
  console.log(`✅ Source: ${frontiersNeuro.name}`)

  // Deactivate old Radiopaedia source if it exists
  try {
    await prisma.source.updateMany({
      where: { slug: 'radiopaedia-cns' },
      data: { isActive: false },
    });
  } catch (e) { /* ignore */ }

  // 8. Healio Neurology (Switched to RSS — was playwright, now working)
  const healio = await prisma.source.upsert({
    where: { slug: 'healio-neurology' },
    update: {
      url: 'https://www.healio.com/news/neurology',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://www.healio.com/rss/neurology',
      },
      isActive: true,
    },
    create: {
      name: 'Healio Neurology',
      slug: 'healio-neurology',
      url: 'https://www.healio.com/news/neurology',
      adapterType: 'rss',
      adapterConfig: {
        feedUrl: 'https://www.healio.com/rss/neurology',
      },
      isActive: true,
      scrapeIntervalMinutes: 360,
    },
  })
  console.log(`✅ Source: ${healio.name}`)


  // ==========================================
  // ТЕСТОВЫЙ ИСТОЧНИК (для разработки)
  // ==========================================
  const testSource = await prisma.source.upsert({
    where: { slug: 'test-source' },
    update: {
      isActive: false, // всегда отключен
    },
    create: {
      name: 'Test Source',
      slug: 'test-source',
      url: 'https://example.com',
      adapterType: 'rss',
      adapterConfig: {},
      isActive: false, // отключен по умолчанию
      scrapeIntervalMinutes: 1440,
    },
  })

  // Используем testSource для тестовых статей
  const source = testSource

  // Создаем тестовые статьи
  const articles = [
    {
      sourceId: source.id,
      externalId: 'test-neuro-1',
      externalUrl: 'https://example.com/neuro/1',
      titleOriginal: 'New Treatment for Migraine Approved',
      contentOriginal: 'FDA approves new CGRP inhibitor for chronic migraine treatment.',
      excerptOriginal: 'Breakthrough in headache medicine.',
      category: 'Головная боль',
      tags: ['migraine', 'fda', 'cgrp'],
      significanceScore: 8,
      status: ArticleStatus.DRAFT,
    },
    {
      sourceId: source.id,
      externalId: 'test-neuro-2',
      externalUrl: 'https://example.com/neuro/2',
      titleOriginal: 'Deep Brain Stimulation for Parkinson\'s',
      contentOriginal: 'Long-term study results showing efficacy of DBS.',
      excerptOriginal: 'DBS shows promise in 10-year follow-up.',
      category: 'Нейродегенеративные',
      tags: ['parkinson', 'dbs', 'neurology'],
      significanceScore: 6,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    {
      sourceId: source.id,
      externalId: 'test-neuro-3',
      externalUrl: 'https://example.com/neuro/3',
      titleOriginal: 'Stroke Rehabilitation Robotics',
      contentOriginal: 'New robotic exoskeleton helps stroke survivors walk.',
      excerptOriginal: 'Robotics in neuro-rehab.',
      category: 'Инсульт',
      tags: ['stroke', 'rehab', 'robotics'],
      significanceScore: 7,
      status: ArticleStatus.SCHEDULED,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // завтра
    },
  ]

  for (const articleData of articles) {
    await prisma.article.upsert({
      where: {
        sourceId_externalId: {
          sourceId: articleData.sourceId,
          externalId: articleData.externalId,
        },
      },
      update: articleData,
      create: articleData,
    })
  }

  console.log('✅ Database seeded with test data')
  console.log(`📰 Created ${articles.length} test articles`)
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

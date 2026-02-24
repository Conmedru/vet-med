
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Configure Radiopaedia
    await prisma.source.update({
        where: { slug: 'radiopaedia-cns' }, // Assuming slug, if not found will fallback or need error handling
        data: {
            adapterType: 'playwright',
            adapterConfig: {
                listUrl: 'https://radiopaedia.org/articles?system=Central+Nervous+System',
                articleSelector: 'a.search-result.search-result-article',
                linkSelector: 'self',
                titleSelector: 'h1',
                contentSelector: '.article-content',
                imageSelector: '.cases-and-figures img',
                waitForSelector: '.search-results-list',
                maxArticles: 10
            }
        }
    });
    console.log('Updated Radiopaedia');

    // 2. Configure Healio Neurology
    await prisma.source.updateMany({
        where: { name: { contains: 'Healio', mode: 'insensitive' } },
        data: {
            adapterType: 'playwright',
            adapterConfig: {
                listUrl: 'https://www.healio.com/neurology/news',
                articleSelector: '.card.article-listing-card',
                linkSelector: '.card-title a',
                titleSelector: 'h1.article__title',
                contentSelector: '.article__content',
                dateSelector: '.date',
                authorSelector: 'a[href^="/authors/"]',
                imageSelector: '.article__header img, .article-image img',
                waitForSelector: '.article-listing-card',
                maxArticles: 10
            }
        }
    });
    console.log('Updated Healio');

    // 3. Configure Neurology (WNL)
    await prisma.source.updateMany({
        where: { name: { contains: 'Neurology (WNL)', mode: 'insensitive' } },
        data: {
            adapterType: 'playwright',
            adapterConfig: {
                listUrl: 'https://www.neurology.org/journal/wnl',
                articleSelector: 'div.issue-item',
                linkSelector: 'a.text-reset.animation-underline',
                titleSelector: 'h1',
                contentSelector: 'div.article__body',
                dateSelector: 'span.citation__date',
                waitForSelector: 'div.issue-item',
                maxArticles: 5 // Reduced due to rate limits
            }
        }
    });
    console.log('Updated Neurology (WNL)');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


import { PrismaClient } from '@prisma/client';
import { ingestSource } from '@/lib/scraper';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching all sources...');
    const sources = await prisma.source.findMany({
        orderBy: { name: 'asc' }
    });

    console.log(`Found ${sources.length} sources.`);
    console.log('----------------------------------------');

    const results = [];

    for (const source of sources) {
        console.log(`Checking ${source.name} (${source.adapterType})...`);

        // Temporarily override maxArticles to 1 for speed
        const config = typeof source.adapterConfig === 'object' ? source.adapterConfig : {};
        // @ts-ignore
        config.maxArticles = 1;

        try {
            // We'll use the existing ingestSource but we want to capture the result
            // Note: ingestSource might try to save to DB. That's fine for now, or we could mock it.
            // For a true "status check", actually trying to ingest is the best test.
            const result = await ingestSource(source.id);

            let status = '✅ OK';
            let details = `${result.newArticles} new, ${result.duplicates} dupes`;

            if (result.errors && result.errors.length > 0) {
                status = '⚠️ Errors';
                details = result.errors.join(', ');
            } else if (result.totalFetched === 0) {
                status = '❌ No Data';
                details = 'Fetched 0 articles (Blocked?)';
            }

            results.push({
                name: source.name,
                active: source.isActive,
                type: source.adapterType,
                status,
                details
            });

        } catch (error: any) {
            console.error(`Failed to scrape ${source.name}:`, error.message);
            results.push({
                name: source.name,
                active: source.isActive,
                type: source.adapterType,
                status: '🔥 Crash',
                details: error.message.slice(0, 50)
            });
        }
        console.log('----------------------------------------');
    }

    console.log('\n=== SOURCE STATUS REPORT ===');
    console.table(results);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { ingestAllSources } from '../lib/scraper';
import { prisma } from '../lib/prisma';

async function main() {
    console.log('🧪 Starting Scraper Source Test...');
    console.log('================================');

    try {
        const results = await ingestAllSources();

        console.log('\n📊 Test Results Summary');
        console.log('================================');

        for (const result of results) {
            const statusIcon = result.errors.length > 0 ? '❌' : (result.totalFetched > 0 ? '✅' : '⚠️');
            console.log(`${statusIcon} Source: ${result.sourceName}`);
            console.log(`   - Fetched: ${result.totalFetched}`);
            console.log(`   - New: ${result.newArticles}`);
            console.log(`   - Duplicates: ${result.duplicates}`);
            if (result.errors.length > 0) {
                console.log(`   - Errors:`);
                result.errors.forEach(err => console.log(`     - ${err}`));
            }
            console.log('--------------------------------');
        }

    } catch (error) {
        console.error('❌ Fatal Test Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();


import { PrismaClient } from '@prisma/client';
import { ingestSource } from '@/lib/scraper';

const prisma = new PrismaClient();
const sourceName = process.argv[2];

async function main() {
    if (!sourceName) {
        console.error('Please provide a partial source name');
        process.exit(1);
    }

    const source = await prisma.source.findFirst({
        where: { name: { contains: sourceName, mode: 'insensitive' } }
    });

    if (!source) {
        console.error('Source not found');
        process.exit(1);
    }

    console.log(`Testing scrape for: ${source.name} (${source.url})`);
    console.log(`Config: ${JSON.stringify(source.adapterConfig, null, 2)}`);

    try {
        const result = await ingestSource(source.id);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Scrape failed:', error);
    }
}

main()
    .finally(async () => {
        await prisma.$disconnect();
    });

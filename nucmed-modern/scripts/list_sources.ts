
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sources = await prisma.source.findMany();
    console.log('Found ' + sources.length + ' sources:');
    for (const s of sources) {
        console.log(`- [${s.adapterType}] ${s.name} (${s.url})`);
        console.log(`  Config: ${JSON.stringify(s.adapterConfig)}`);
        console.log('---');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

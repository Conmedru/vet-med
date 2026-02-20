
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Fix MedicalXpress
    const medXpress = await prisma.source.findFirst({
        where: { name: { contains: 'MedicalXpress', mode: 'insensitive' } }
    });

    if (medXpress) {
        const newUrl = 'https://medicalxpress.com/rss-feed/neurology-news/';
        await prisma.source.update({
            where: { id: medXpress.id },
            data: {
                isActive: true,
                adapterConfig: {
                    feedUrl: newUrl
                }
            }
        });
        console.log(`✅ Updated MedicalXpress URL to: ${newUrl}`);
    } else {
        console.log('⚠️ MedicalXpress source not found.');
    }

    // Also verify Healio is definitely active (double check)
    const healio = await prisma.source.findFirst({
        where: { name: { contains: 'Healio', mode: 'insensitive' } }
    });
    if (healio && !healio.isActive) {
        await prisma.source.update({
            where: { id: healio.id },
            data: { isActive: true }
        });
        console.log('✅ Healio activated (retry).');
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

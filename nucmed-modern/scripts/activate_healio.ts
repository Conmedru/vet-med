
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Activate Healio
    const healio = await prisma.source.findFirst({
        where: { name: { contains: 'Healio', mode: 'insensitive' } }
    });

    if (healio) {
        if (!healio.isActive) {
            await prisma.source.update({
                where: { id: healio.id },
                data: { isActive: true }
            });
            console.log('✅ Healio Neurology activated.');
        } else {
            console.log('ℹ️ Healio Neurology is already active.');
        }
    } else {
        console.log('⚠️ Healio Neurology source not found.');
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

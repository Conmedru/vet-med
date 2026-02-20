import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

/**
 * Replicating the hashPassword logic from lib/auth/utils.ts
 * as running complex imports in standalone tsx scripts can sometimes be tricky
 */
function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
    return `${salt}:${hash}`;
}

async function main() {
    const email = "superadmin@neurology.today";
    const password = "super-neurology-2026";
    const role = "SUPER_ADMIN";

    console.log(`Updating ${role} user with correct hash: ${email}...`);

    try {
        const passwordHash = hashPassword(password);

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                passwordHash,
                role: role as any,
                status: "ACTIVE",
                emailVerified: true,
            },
            create: {
                email,
                passwordHash,
                role: role as any,
                status: "ACTIVE",
                emailVerified: true,
                name: "Super Admin",
            },
        });

        console.log("Superadmin user updated successfully with correct algorithm.");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
    } catch (error) {
        console.error("Failed to update superadmin:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

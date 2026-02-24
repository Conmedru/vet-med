
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/utils";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/reset-password.ts <email> <password>");
    process.exit(1);
  }

  const hashedPassword = hashPassword(password);

  try {
    const user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash: hashedPassword,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerified: true,
      },
    });
    console.log(`✅ Password updated for user ${user.email}`);
    console.log(`New password: ${password}`);
  } catch (error) {
    console.error(`❌ Failed to update password: ${error}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();

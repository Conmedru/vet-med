/**
 * Создаёт или сбрасывает пароль суперадмина админки.
 *
 *   npx tsx scripts/create-superadmin.ts editor@con-vet.ru
 *
 * Пароль генерируется случайный и печатается один раз — передайте его владельцу
 * учётки и попросите сменить. Зашитых паролей и учёток здесь быть не должно.
 */
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/utils";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Usage: npx tsx scripts/create-superadmin.ts <email>");
    process.exitCode = 1;
    return;
  }
  const password = randomBytes(18).toString("base64url");
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hashPassword(password), role: "SUPER_ADMIN", status: "ACTIVE", emailVerified: true },
    create: { email, passwordHash: hashPassword(password), name: "Administrator", role: "SUPER_ADMIN", status: "ACTIVE", emailVerified: true },
  });
  // Old sessions of this account must not survive a password reset
  await prisma.session.deleteMany({ where: { user: { email } } });
  console.log(`Superadmin ready: ${email}`);
  console.log(`One-time password: ${password}`);
}

main().finally(() => prisma.$disconnect());

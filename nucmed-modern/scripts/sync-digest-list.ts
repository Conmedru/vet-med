/**
 * Puts everyone who chose the digest on the site into the Unisender list vet-digest (7).
 *
 * Until 2026-11-16 the site had no Unisender key on the hosting: the account toggle and the
 * subscribe form saved the choice in the database, but the list stayed empty, and the Monday
 * campaign would reach nobody.
 *
 *   npx tsx scripts/sync-digest-list.ts           # shows who would be added, changes nothing
 *   npx tsx scripts/sync-digest-list.ts --apply   # subscribes them to list 7
 *
 * Only list 7 and only `subscribe` with double_optin=3 (consent given on the site, no letter).
 * Never `unsubscribe`: without list_ids it removes the person from every list of the shared account.
 */
import { prisma } from "@/lib/prisma";
import { unisender, VET_LIST_ID } from "@/lib/unisender";

const apply = process.argv.includes("--apply");
const mask = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2");

async function main() {
  const [members, subscribers] = await Promise.all([
    prisma.member.findMany({ where: { status: "ACTIVE", digestEnabled: true }, select: { email: true } }),
    prisma.subscriber.findMany({ where: { status: "active", digestEnabled: true }, select: { email: true } }),
  ]);
  const emails = [...new Set([...members, ...subscribers].map((r) => r.email.trim().toLowerCase()))];
  console.log(`Members ${members.length}, subscribers ${subscribers.length}, unique ${emails.length}; list ${VET_LIST_ID}`);

  let ok = 0;
  for (const email of emails) {
    if (!apply) {
      console.log("  would add", mask(email));
      continue;
    }
    try {
      await unisender.subscribe(email, VET_LIST_ID, { SUBSCRIPTION_TYPE: "digest" });
      ok++;
      console.log("  added", mask(email));
    } catch (error) {
      console.error("  FAILED", mask(email), error instanceof Error ? error.message : error);
    }
  }
  if (apply) console.log(`Done: ${ok} of ${emails.length}`);
  else console.log("Dry run. Add --apply to subscribe.");
}

main().finally(() => prisma.$disconnect());

/**
 * Сверка уже опубликованных статей с исходником правилами lib/ai/fidelity.ts.
 * Только чтение, без вызова ИИ — бесплатно.
 *
 *   npx tsx scripts/audit-fidelity.ts [--limit 500] [--examples 5]
 *
 * Показывает, сколько статей прошло бы правила и почему не прошли остальные:
 * так видно и долю старых галлюцинаций, и строгость порогов.
 */
import { PrismaClient } from "@prisma/client";
import { checkFidelity } from "../lib/ai/fidelity";

const prisma = new PrismaClient();
const arg = (name: string, def: number) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : def;
};
const LIMIT = arg("--limit", 500);
const EXAMPLES = arg("--examples", 5);

async function main() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", content: { not: null } },
    select: { id: true, slug: true, title: true, titleOriginal: true, contentOriginal: true, excerptOriginal: true, excerpt: true, content: true },
    orderBy: { publishedAt: "desc" },
    take: LIMIT,
  });

  const byCode: Record<string, number> = {};
  const examples: Record<string, string[]> = {};
  let ok = 0;
  for (const a of articles) {
    const r = checkFidelity({
      source: [a.titleOriginal, a.contentOriginal, a.excerptOriginal ?? ""],
      output: `${a.title ?? ""}\n${a.excerpt ?? ""}\n${a.content ?? ""}`,
    });
    if (r.ok) ok++;
    for (const issue of r.issues) {
      byCode[issue.code] = (byCode[issue.code] ?? 0) + 1;
      (examples[issue.code] ??= []).length < EXAMPLES && examples[issue.code].push(`${a.slug ?? a.id}: ${issue.detail}`);
    }
  }

  console.log(`Проверено ${articles.length}, прошли бы правила: ${ok} (${Math.round((ok / Math.max(1, articles.length)) * 100)}%)`);
  for (const [code, n] of Object.entries(byCode).sort((x, y) => y[1] - x[1])) {
    console.log(`\n${code}: ${n}`);
    for (const e of examples[code]) console.log(`  - ${e.slice(0, 220)}`);
  }
}

main().finally(() => prisma.$disconnect());

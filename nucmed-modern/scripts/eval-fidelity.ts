/**
 * Живой прогон обработки с проверками на N статьях — без записи в БД.
 * Тратит деньги на общем счёте Replicate (~$0.05–0.07 за статью): запускать экономно.
 *
 *   npx tsx scripts/eval-fidelity.ts [--limit 5] [--short]   (--short — только анонсы до 600 зн.)
 *
 * Берёт последние опубликованные статьи с исходником ≥150 зн., заново генерирует
 * текст текущим промптом и показывает итог правил и фактчекера.
 */
import { PrismaClient } from "@prisma/client";
import { callReplicateAI, DEFAULT_TEXT_MODEL } from "../lib/ai/replicate";
import { buildArticleProcessingUserPrompt } from "../lib/ai/prompts";
import { parsePartialJson } from "../lib/utils/json";
import { checkFidelity, formatFidelityIssues, stripToText } from "../lib/ai/fidelity";
import { factCheckArticle, formatFactCheckIssues } from "../lib/ai/fact-check";

const prisma = new PrismaClient();
const i = process.argv.indexOf("--limit");
const LIMIT = i > -1 ? Number(process.argv[i + 1]) : 5;
const SHORT = process.argv.includes("--short");

async function main() {
  const candidates = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, titleOriginal: true, contentOriginal: true, excerptOriginal: true, source: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });
  const picked = candidates
    .filter((a) => {
      const n = stripToText(`${a.contentOriginal}\n${a.excerptOriginal ?? ""}`).length;
      return n >= 150 && (!SHORT || n <= 600);
    })
    .slice(0, LIMIT);
  let cost = 0;
  let passed = 0;
  for (const a of picked) {
    const source = [a.contentOriginal, a.excerptOriginal ?? ""];
    const res = await callReplicateAI(
      buildArticleProcessingUserPrompt({ sourceName: a.source?.name || "Unknown", titleOriginal: a.titleOriginal, contentOriginal: a.contentOriginal.slice(0, 12000), excerptOriginal: a.excerptOriginal }),
      DEFAULT_TEXT_MODEL
    );
    cost += res.costUsd ?? 0;
    const out = parsePartialJson(res.output) as { title?: string; excerpt?: string; content?: string };
    const rules = checkFidelity({ source: [a.titleOriginal, ...source], output: `${out.title}\n${out.excerpt ?? ""}\n${out.content ?? ""}` });
    let verdict = "skipped";
    let issues = "";
    if (rules.ok) {
      const fc = await factCheckArticle({ titleOriginal: a.titleOriginal, source: source.join("\n"), title: out.title ?? "", excerpt: out.excerpt, content: out.content ?? "" });
      cost += fc.costUsd;
      verdict = fc.verdict;
      issues = formatFactCheckIssues(fc);
    }
    const ok = rules.ok && verdict !== "major";
    if (ok) passed++;
    console.log(`\n${ok ? "✓" : "✗"} ${a.titleOriginal.slice(0, 90)}`);
    console.log(`  исходник ${rules.stats.sourceChars} зн. → текст ${rules.stats.outputChars} зн.; правила: ${rules.ok ? "ok" : formatFidelityIssues(rules.issues)}; фактчекер: ${verdict}${issues ? ` — ${issues.slice(0, 300)}` : ""}`);
  }
  console.log(`\nПрошли с первой генерации: ${passed}/${picked.length}; потрачено ≈ $${cost.toFixed(2)}`);
}

main().finally(() => prisma.$disconnect());

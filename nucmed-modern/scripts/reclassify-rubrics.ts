import { PrismaClient } from '@prisma/client';
import { callReplicateAI, type ReplicateModel } from '@/lib/ai/replicate';
import { RUBRICS_PROMPT_SECTION } from '@/lib/ai/prompts';
import { parsePartialJson } from '@/lib/utils/json';
import { primaryRubricName, rubricsFromAI } from '@/lib/rubrics';

/**
 * Переразметка уже обработанных статей по новым рубрикам (животные, специализации,
 * диагностика, разделы). В ИИ уходит только заголовок, анонс и начало текста.
 * Повторный запуск пропускает уже переразмеченные статьи (ActivityLog article.reclassified).
 *
 * Запуск:
 *   npx tsx scripts/reclassify-rubrics.ts --dry-run        # сколько статей и примерная стоимость
 *   npx tsx scripts/reclassify-rubrics.ts --limit 20       # первые 20, для проверки качества
 *   npx tsx scripts/reclassify-rubrics.ts                  # все
 *   --model claude-3.5-haiku                               # модель (по умолчанию claude-4-sonnet)
 */

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : undefined;
const modelArg = args.indexOf('--model');
const model = (modelArg >= 0 ? args[modelArg + 1] : 'claude-4-sonnet') as ReplicateModel;

// Цены за 1M токенов (input, output) для оценки; ~3 символа кириллицы на токен
const PRICES: Record<string, [number, number]> = {
  'claude-4-sonnet': [3, 15],
  'claude-3.5-haiku': [0.8, 4],
};
const CHARS_PER_TOKEN = 3;
const CONTENT_CHARS = 1500;

const SYSTEM_PROMPT = `Ты — редактор ветеринарного портала. Определи рубрики статьи.

${RUBRICS_PROMPT_SECTION}

ФОРМАТ ОТВЕТА — строго JSON без обёртки и комментариев:
{"rubrics":{"animals":["slug"],"specialties":["slug"],"diagnostics":[],"sections":[]}}`;

function buildPrompt(a: { title: string | null; titleOriginal: string; excerpt: string | null; content: string | null }) {
  return `ЗАГОЛОВОК: ${a.title || a.titleOriginal}

АНОНС: ${a.excerpt || '—'}

НАЧАЛО ТЕКСТА:
${(a.content || '').slice(0, CONTENT_CHARS)}`;
}

async function main() {
  const done = await prisma.activityLog.findMany({
    where: { action: 'article.reclassified', entityType: 'article' },
    select: { entityId: true },
  });
  const doneIds = done.map((d) => d.entityId).filter((id): id is string => !!id);

  const articles = await prisma.article.findMany({
    where: {
      status: { in: ['PUBLISHED', 'SCHEDULED', 'DRAFT'] },
      content: { not: null },
      id: { notIn: doneIds },
    },
    select: { id: true, title: true, titleOriginal: true, excerpt: true, content: true, category: true, rubrics: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });

  const [inPrice, outPrice] = PRICES[model] || PRICES['claude-4-sonnet'];
  const inputChars = articles.reduce((sum, a) => sum + SYSTEM_PROMPT.length + buildPrompt(a).length, 0);
  const estimate = (inputChars / CHARS_PER_TOKEN) * (inPrice / 1e6) + articles.length * 80 * (outPrice / 1e6);
  console.log(`Articles to reclassify: ${articles.length} (already done: ${doneIds.length}), model ${model}`);
  console.log(`Estimated cost: ~$${estimate.toFixed(2)}`);
  if (dryRun) return;

  let ok = 0;
  let failed = 0;
  for (const [i, article] of articles.entries()) {
    try {
      const response = await callReplicateAI(buildPrompt(article), model, { systemPrompt: SYSTEM_PROMPT, maxTokens: 300 });
      const rubrics = rubricsFromAI(parsePartialJson(response.output).rubrics);
      const category = primaryRubricName(rubrics) || article.category;

      await prisma.article.update({ where: { id: article.id }, data: { rubrics, category } });
      await prisma.activityLog.create({
        data: {
          action: 'article.reclassified',
          entityType: 'article',
          entityId: article.id,
          actorType: 'system',
          metadata: { model: response.model, before: article.rubrics, after: rubrics },
        },
      });
      ok++;
      console.log(`[${i + 1}/${articles.length}] ${(article.title || article.titleOriginal).slice(0, 60)} → ${rubrics.join(', ')}`);
    } catch (error) {
      failed++;
      console.error(`[${i + 1}/${articles.length}] FAILED ${article.id}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`Done: ${ok} reclassified, ${failed} failed`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

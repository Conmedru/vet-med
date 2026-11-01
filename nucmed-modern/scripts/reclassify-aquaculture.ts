import { PrismaClient } from '@prisma/client';
import { callReplicateAI } from '@/lib/ai/replicate';
import { parsePartialJson } from '@/lib/utils/json';
import { FARM_SLUG, primaryRubricName } from '@/lib/rubrics';

/**
 * Рыбы и креветки из аквакультуры стояли в «Экзотах» и попадали на главную в «Свежее о питомцах»
 * (клиент, 31.10.2026: «белая тихоокеанская креветка»). Статьи из «Экзотов» о рыбах, ракообразных,
 * моллюсках и трепангах (кроме декоративных аквариумных рыб) переносятся в farm-animals.
 * Повторный запуск пропускает проверенные статьи (ActivityLog article.aquaculture-checked).
 *
 * Запуск:
 *   npx tsx scripts/reclassify-aquaculture.ts --limit 20     # показать решения, ничего не записывать
 *   npx tsx scripts/reclassify-aquaculture.ts --apply        # все, с записью
 */

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : undefined;
const EXOTICS = 'exotics';

const SYSTEM_PROMPT = `Ты — редактор ветеринарного портала CON-VET.ru. Статья стоит в рубрике «Экзоты». Определи, о ком она.

aquatic = true, если главные животные статьи — рыбы, креветки и другие ракообразные, моллюски, трепанги: аквакультура, рыбоводство, промысел, лабораторные рыбы (данио). Также true для статей о патогенах, кормах и препаратах для таких животных.
aquatic = false, если статья о рептилиях, амфибиях, птицах, млекопитающих (в том числе морских: тюлени, морские львы), диких и зоопарковых животных, или о декоративных аквариумных рыбах у владельцев. Если рыбы лишь одни из многих видов в статье — false.

Ответ — строго JSON без обёртки: {"aquatic": true} или {"aquatic": false}.`;

async function main() {
  const done = await prisma.activityLog.findMany({
    where: { action: 'article.aquaculture-checked', entityType: 'article' },
    select: { entityId: true },
  });
  const doneIds = done.map((d) => d.entityId).filter((id): id is string => !!id);

  const articles = await prisma.article.findMany({
    where: { status: 'PUBLISHED', rubrics: { has: EXOTICS }, id: { notIn: doneIds } },
    select: { id: true, title: true, titleOriginal: true, excerpt: true, category: true, rubrics: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
  console.log(`Articles to check: ${articles.length} (already checked: ${doneIds.length}), ${apply ? 'APPLY' : 'dry run'}`);

  let moved = 0;
  let failed = 0;
  for (const [i, article] of articles.entries()) {
    try {
      const prompt = `ЗАГОЛОВОК: ${article.title || article.titleOriginal}\nОРИГИНАЛЬНЫЙ ЗАГОЛОВОК: ${article.titleOriginal}\n\nАНОНС: ${article.excerpt || '—'}`;
      const response = await callReplicateAI(prompt, 'claude-4.5-haiku', { systemPrompt: SYSTEM_PROMPT, maxTokens: 64 });
      const aquatic = parsePartialJson(response.output).aquatic;
      if (typeof aquatic !== 'boolean') throw new Error(`No answer: ${response.output.slice(0, 120)}`);
      const rubrics = aquatic
        ? [...new Set(article.rubrics.filter((slug) => slug !== EXOTICS).concat(FARM_SLUG))]
        : article.rubrics;
      if (aquatic) moved++;
      console.log(`[${i + 1}/${articles.length}] ${aquatic ? 'MOVE' : 'keep'} | ${(article.title || article.titleOriginal).slice(0, 80)}`);
      if (!apply) continue;

      if (aquatic) {
        await prisma.article.update({
          where: { id: article.id },
          data: { rubrics, category: primaryRubricName(rubrics) || article.category },
        });
      }
      await prisma.activityLog.create({
        data: {
          action: 'article.aquaculture-checked',
          entityType: 'article',
          entityId: article.id,
          actorType: 'system',
          metadata: { model: response.model, before: article.rubrics, moved: aquatic },
        },
      });
    } catch (error) {
      failed++;
      console.error(`[${i + 1}/${articles.length}] FAILED ${article.id}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`Done: ${moved} of ${articles.length} moved to ${FARM_SLUG}${apply ? '' : ' (dry run, nothing written)'}, ${failed} failed`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

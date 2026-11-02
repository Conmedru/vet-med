import { PrismaClient } from '@prisma/client';
import { callReplicateAI } from '@/lib/ai/replicate';
import { parsePartialJson } from '@/lib/utils/json';
import { primaryRubricName } from '@/lib/rubrics';

/**
 * Рыбы и креветки из аквакультуры стояли в «Экзотах» и попадали на главную в «Свежее о питомцах»
 * (клиент, 31.10.2026: «белая тихоокеанская креветка»). Статьи из «Экзотов» о рыбах, ракообразных,
 * моллюсках и трепангах (кроме декоративных аквариумных рыб) переносятся в farm-animals.
 * Повторный запуск пропускает проверенные статьи (ActivityLog article.exotics-checked).
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
const RODENTS = 'rodents';

const SYSTEM_PROMPT = `Ты — редактор ветеринарного портала CON-VET.ru. Статья стоит в рубрике «Экзоты». Экзоты — это рептилии, амфибии, паукообразные, насекомые, декоративные аквариумные рыбы, дикие и зоопарковые животные (включая диких млекопитающих и птиц в природе).

Кролики, хорьки, мыши, крысы, хомяки, морские свинки, шиншиллы, дегу, полёвки и другие грызуны — НЕ экзоты (у них своя рубрика), в том числе лабораторные и дикие грызуны.

exotic = true, если в статье есть хотя бы одно животное-экзот из списка выше.
small_mammal = true, если в статье есть кролики, хорьки или грызуны.

Ответ — строго JSON без обёртки: {"exotic": true|false, "small_mammal": true|false}.`;

async function main() {
  const done = await prisma.activityLog.findMany({
    where: { action: 'article.exotics-checked', entityType: 'article' },
    select: { entityId: true },
  });
  const doneIds = done.map((d) => d.entityId).filter((id): id is string => !!id);

  const articles = await prisma.article.findMany({
    where: { status: { in: ['PUBLISHED', 'SCHEDULED'] }, rubrics: { has: EXOTICS }, id: { notIn: doneIds } },
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
      const { exotic, small_mammal: smallMammal } = parsePartialJson(response.output);
      if (typeof exotic !== 'boolean' || typeof smallMammal !== 'boolean') throw new Error(`No answer: ${response.output.slice(0, 120)}`);
      // Only when no exotic animal is left: an article about rabbits and reptiles keeps both rubrics
      const move = !exotic && smallMammal;
      const rubrics = move
        ? [...new Set(article.rubrics.filter((slug) => slug !== EXOTICS).concat(RODENTS))]
        : smallMammal ? [...new Set(article.rubrics.concat(RODENTS))] : article.rubrics;
      if (move) moved++;
      console.log(`[${i + 1}/${articles.length}] ${move ? 'MOVE' : smallMammal ? 'both' : 'keep'} | ${(article.title || article.titleOriginal).slice(0, 80)}`);
      if (!apply) continue;

      if (rubrics.length !== article.rubrics.length || move) {
        await prisma.article.update({
          where: { id: article.id },
          data: { rubrics, category: primaryRubricName(rubrics) || article.category },
        });
      }
      await prisma.activityLog.create({
        data: {
          action: 'article.exotics-checked',
          entityType: 'article',
          entityId: article.id,
          actorType: 'system',
          metadata: { model: response.model, before: article.rubrics, after: rubrics, moved: move },
        },
      });
    } catch (error) {
      failed++;
      console.error(`[${i + 1}/${articles.length}] FAILED ${article.id}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`Done: ${moved} of ${articles.length} moved to ${RODENTS}${apply ? '' : ' (dry run, nothing written)'}, ${failed} failed`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

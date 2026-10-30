import { PrismaClient } from '@prisma/client';
import { callReplicateAI } from '@/lib/ai/replicate';
import { parsePartialJson } from '@/lib/utils/json';
import { DIAGNOSTICS_SLUGS, getRubric, primaryRubricName } from '@/lib/rubrics';

/**
 * Снимает лишние рубрики диагностики (УЗИ, рентгенология, лаборатория, гистология, генетика):
 * ИИ ставил их, если метод лишь упомянут — кролику с грыжей сделали рентген, и статья попала
 * в «Диагностику» на главной (клиент, 2026-10-30). Модель только выбирает, какие из уже
 * стоящих методов оставить; новые рубрики не добавляются, остальные рубрики не трогаются.
 * Повторный запуск пропускает проверенные статьи (ActivityLog article.diagnostics-checked).
 *
 * Запуск:
 *   npx tsx scripts/prune-diagnostics.ts --limit 20     # показать решения, ничего не записывать
 *   npx tsx scripts/prune-diagnostics.ts --apply        # все, с записью
 */

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : undefined;
const CONTENT_CHARS = 1500;

const SYSTEM_PROMPT = `Ты — редактор ветеринарного портала CON-VET.ru. У статьи стоят рубрики методов диагностики. Реши, какие из них оставить. По умолчанию — убрать.

Оставляй метод, только если статья — о самом методе диагностики, и это видно уже по заголовку: точность или сравнение методов, как читать результат, новый тест или маркер для диагноза или прогноза, референсные значения, техника исследования. Генетика — также статьи о наследственных болезнях, породах и генетических тестах.
Убирай во всех остальных случаях, даже если метод занимает много места в тексте:
- клинический случай, где пациенту сделали рентген, УЗИ, КТ или анализы (Rhodococcus у собаки, гамартома у кота);
- исследование лечения, кормления, физиологии или продуктивности, где кровь или ткани — только способ измерить результат (железо у коров после отёла, эфирные масла и рост овец, качество спермы);
- эпидемиология, устойчивость к антибиотикам, вирусология, где ПЦР или секвенирование — инструмент (E. coli на фермах, новые виды клещей);
- модели болезней и фундаментальная биология (модель синовита у лошадей, РНК и синтез тестостерона);
- контроль остатков препаратов в продуктах.

Ответ — строго JSON без обёртки: {"keep":["slug"]} — только slug из списка в запросе, пустой список, если ни один не тема статьи.`;

function buildPrompt(a: { title: string | null; titleOriginal: string; excerpt: string | null; content: string | null }, methods: string[]) {
  return `МЕТОДЫ У СТАТЬИ: ${methods.map((slug) => `${slug} (${getRubric(slug)?.name})`).join(', ')}

ЗАГОЛОВОК: ${a.title || a.titleOriginal}

АНОНС: ${a.excerpt || '—'}

НАЧАЛО ТЕКСТА:
${(a.content || '').slice(0, CONTENT_CHARS)}`;
}

async function main() {
  const done = await prisma.activityLog.findMany({
    where: { action: 'article.diagnostics-checked', entityType: 'article' },
    select: { entityId: true },
  });
  const doneIds = done.map((d) => d.entityId).filter((id): id is string => !!id);

  const articles = await prisma.article.findMany({
    where: { status: 'PUBLISHED', rubrics: { hasSome: DIAGNOSTICS_SLUGS }, id: { notIn: doneIds } },
    select: { id: true, title: true, titleOriginal: true, excerpt: true, content: true, category: true, rubrics: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
  console.log(`Articles to check: ${articles.length} (already checked: ${doneIds.length}), ${apply ? 'APPLY' : 'dry run'}`);

  let removed = 0;
  let failed = 0;
  for (const [i, article] of articles.entries()) {
    const methods = article.rubrics.filter((slug) => DIAGNOSTICS_SLUGS.includes(slug));
    try {
      const response = await callReplicateAI(buildPrompt(article, methods), 'claude-4.5-haiku', { systemPrompt: SYSTEM_PROMPT, maxTokens: 1024 });
      const keepRaw = parsePartialJson(response.output).keep;
      if (!Array.isArray(keepRaw)) throw new Error(`No keep list: ${response.output.slice(0, 120)}`);
      const keep = methods.filter((slug) => keepRaw.includes(slug));
      const drop = methods.filter((slug) => !keep.includes(slug));
      const rubrics = article.rubrics.filter((slug) => !drop.includes(slug));
      if (drop.length) removed++;
      console.log(`[${i + 1}/${articles.length}] ${(article.title || article.titleOriginal).slice(0, 70)} | keep: ${keep.join(',') || '—'} | drop: ${drop.join(',') || '—'}`);
      if (!apply) continue;

      if (drop.length) {
        await prisma.article.update({
          where: { id: article.id },
          data: { rubrics, category: primaryRubricName(rubrics) || article.category },
        });
      }
      await prisma.activityLog.create({
        data: {
          action: 'article.diagnostics-checked',
          entityType: 'article',
          entityId: article.id,
          actorType: 'system',
          metadata: { model: response.model, before: article.rubrics, dropped: drop },
        },
      });
    } catch (error) {
      failed++;
      console.error(`[${i + 1}/${articles.length}] FAILED ${article.id}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`Done: ${removed} of ${articles.length} lose a diagnostics rubric${apply ? '' : ' (dry run, nothing written)'}, ${failed} failed`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

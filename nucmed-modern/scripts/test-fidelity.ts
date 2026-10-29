/**
 * Регрессионные тесты lib/ai/fidelity.ts: случаи из Neuro 2.0 (разбор базы
 * neuro-pulse.news и аудит 2026-09-26) и ветеринарные — дозы и концентрации.
 * Гонять после любой правки fidelity.ts или промпта обработки.
 * Без БД и сети:  npx tsx scripts/test-fidelity.ts
 */
import assert from 'node:assert/strict';
import { checkFidelity, extractDoseTokens, extractNumberTokens, onlyRetryable, stripToText } from '../lib/ai/fidelity';
import { isIntervalFormatNitpick } from '../lib/ai/fact-check';

let passed = 0;
function test(name: string, fn: () => void) {
  try { fn(); passed++; } catch (e) { console.error(`✗ ${name}\n  ${e instanceof Error ? e.message : e}`); process.exitCode = 1; }
}
const nums = (s: string) => extractNumberTokens(s).map((t) => t.join('|'));
const codes = (source: string | string[], output: string, strictTemplate = false) =>
  checkFidelity({ source, output, strictTemplate }).issues.map((i) => i.code);
// Исходник средней длины: не «пустой» (<150) и не «длинный» (>1500, где короткий пересказ = недоперевод).
const long = (s: string) => `${s} `.repeat(Math.max(1, Math.floor(900 / s.length)));

// ─── Разбор чисел ───
test('английские тысячи и русская дробь', () => {
  assert.deepEqual(nums('2,700 and 20 000'), ['2700|2.7', '20000']);
  assert.deepEqual(nums('AUC **0,912**'), ['912|0.912']);
});
test('десятичная точка Lancet «2·25»', () => assert.deepEqual(nums('(2·25, 1·52-3·34)'), ['2.25', '1.52', '3.34']));
test('знак минус и диапазоны', () => {
  assert.deepEqual(nums('and −1.76 ± 3.11'), ['-1.76', '3.11']);
  assert.deepEqual(nums('CI − 1.80 to −0.49'), ['-1.8', '-0.49']);
  assert.deepEqual(nums('(**−5,8 дней**'), ['-5.8']);
  assert.deepEqual(nums('95% CI: 1.19,–0.49'), ['95', '1.19', '-0.49']);
  assert.deepEqual(nums('1,52–3,34'), ['1.52', '3.34']);
  assert.deepEqual(nums('aged 58 -87 years'), ['58', '87']);
});
test('дефис в слове и пункт списка — не минус', () => {
  assert.deepEqual(nums('p-тау-217'), ['217']);
  assert.deepEqual(nums('- 15 исследований\n- 173 пациента'), ['15', '173']);
});
test('«P < 0.001 … > 0.05» — не HTML-тег', () => assert.match(stripToText('(P < 0.001). AUCs were 0.912 (p > 0.05)'), /0\.912/));

// ─── Проверка целиком ───
const abstract = long('Retrospective cohort of 3,016 patients: 2,229 had no fever burden. AUC improved from 0.774 to 0.808 (95% CI 0.71–0.86; p < 0.001).');
test('честный перевод с посчитанным процентом проходит', () =>
  assert.deepEqual(codes(abstract, '## Результаты\nУ **2229 из 3016** (73,9%) не было лихорадки; AUC выросла с 0,774 до 0,808 (95% ДИ 0,71–0,86; p < 0,001).'), []));
test('выдуманные числа по пустому оригиналу', () =>
  assert.deepEqual(codes('Statin pretreatment in sepsis-associated encephalopathy', '## Результаты\nСмертность ниже на 47% (ОР 0,53; 95% ДИ 0,34–0,81; p = 0,003), n = 472.'), ['no-source', 'invented-numbers']));
test('чужой год', () =>
  assert.ok(codes(long('Databases were searched to April 30, 2026; 34 articles included.'), 'Поиск до апреля 2024 года, 34 статьи.').includes('invented-numbers')));
test('потерянный минус в ДИ', () =>
  assert.ok(codes(long('Mental health MD 0.84 (95% CI: 1.19,–0.49).'), 'Психическое здоровье: MD 0,84 (95% ДИ 1,19–0,49).').includes('invented-numbers')));
test('знак словами вне ДИ — не ошибка', () =>
  assert.deepEqual(codes(long('Caregiver burden was lower (−31%; ZBI 28.4 ± 6.3).'), 'Бремя ухаживающих ниже на **31%** (ZBI 28,4 ± 6,3).'), []));
test('анонс, раздутый в статью', () => {
  const teaser = 'Researchers found that alcohol metabolites directly regulate gene expression in the brain. The ventral hippocampus is especially sensitive, providing a new molecular target for alcohol use disorder.';
  assert.ok(codes(teaser, `## Ключевые результаты\n${'Текст. '.repeat(120)}\n## Методология\nИсследование, по-видимому, включало анализ.\n## Клиническое значение\nВажно.`).includes('inflated'));
});
test('короткий абстракт в разделах: мягко в конвейере, строго для старого шаблона', () => {
  const src = 'Case of DLBCL presenting with neurological symptoms mimicking demyelination; diagnosis confirmed at postmortem. '.repeat(6);
  const out = `## Результаты\n${'Описан случай. '.repeat(40)}\n## Значение\nБиопсия.\n## Выводы\nИтог.`;
  assert.deepEqual(codes(src, out), []);
  assert.ok(codes(src, out, true).includes('inflated'));
});
test('оговорка есть в оригинале — не домысел', () =>
  assert.deepEqual(codes(long('FXIa appears to contribute more to thrombosis than haemostasis.'), 'FXIa, по-видимому, вносит больший вклад в тромбоз, чем в гемостаз.'), []));
test('сбои генерации — повторяемые', () => {
  const r = checkFidelity({ source: abstract, output: '```json\n{"title": "Х", "content": "текст"' });
  assert.ok(r.issues.some((i) => i.code === 'raw-json'));
  const g = checkFidelity({ source: abstract, output: 'Ингибиторы холинэстеrazы при деменции: AUC 0,774 и 0,808, 3016 пациентов, 2229 без лихорадки. '.repeat(12) });
  assert.deepEqual(g.issues.map((i) => i.code), ['garbled']);
  assert.ok(onlyRetryable(g.issues));
});
test('недоперевод длинного абстракта', () =>
  assert.ok(codes(abstract.repeat(2), 'Кратко: AUC 0,774 → 0,808.').includes('incomplete')));
test('полный текст статьи: изложение короче оригинала — не «неполный перевод»', () => {
  const full = 'Clinical background paragraph without numbers describing the disease course and management. '.repeat(80);
  assert.ok(full.length > 6000);
  assert.ok(!codes(full, 'Изложение: течение заболевания и ведение пациентов. '.repeat(20)).includes('incomplete'));
});

// ─── Ветеринария: дозы и концентрации ───
const doseSrc = long('Dogs (n = 24) received meloxicam 0.1 mg/kg orally once daily for 14 days; 5 mg/kg of gabapentin was added in 8 dogs.');
test('разбор доз', () => {
  assert.deepEqual(extractDoseTokens('мелоксикам 0,1 мг/кг и 5 mg/kg, 20 МЕ, 2 мл, 10%').map((t) => t[0]), ['0.1', '5', '20', '2']);
});
test('дозы как в оригинале — проходит', () =>
  assert.deepEqual(codes(doseSrc, 'Собакам (n = 24) давали мелоксикам **0,1 мг/кг** перорально раз в сутки 14 дней; 8 собакам добавили габапентин 5 мг/кг.'), []));
test('выдуманная доза — брак даже одна', () =>
  assert.ok(codes(doseSrc, 'Собакам (n = 24) давали мелоксикам 0,2 мг/кг перорально раз в сутки 14 дней.').includes('invented-dose')));
test('доза при пустом в оригинале числе — брак', () =>
  assert.ok(codes(long('Gabapentin was added for chronic pain in dogs with osteoarthritis and improved owner-reported mobility.'), 'Габапентин в дозе 10 мг/кг улучшил подвижность собак с остеоартритом.').includes('invented-dose')));

// ─── Фактчекер: придирки к записи ДИ через «; » (прогон 2026-09-29) ───
test('формат ДИ «; » — не искажение', () => {
  for (const t of [
    "95% ДИ записан как «1,352; 1,987» вместо диапазона. Оригинал: «95% CI: 1.352–1.987», перевод: «95% ДИ 1,352; 1,987» — пропущено тире/дефис между границами интервала",
    "95% ДИ записан как '0,394; 0,945' вместо '0,394–0,945' — пропущено тире между границами доверительного интервала, превращает интервал в две отдельные цифры",
    "HR 1.49; 95% ДИ 0,96; 2,30 — искажение интервала: в оригинале «95%CI 0.96-2.30», в переводе «0,96; 2,30» выглядит как две отдельные точки через точку с запятой вместо диапазона",
    "OR 1,93; 95% ДИ 1,56; 2,39 — искажение доверительного интервала. В оригинале: 95% CI, 1.56–2.39 (интервал от 1,56 до 2,39), в переводе: 95% ДИ 1,56; 2,39 (запятая с точкой с запятой создаёт впечатление перечисления двух отдельных значений вместо границ интервала)",
  ]) assert.ok(isIntervalFormatNitpick(t), t);
});
test('настоящие искажения ДИ остаются', () => {
  for (const t of [
    "Знак нижней границы ДИ: в оригинале «−0.49», в переводе «0,49»",
    "В анализе указан «ОР 0,76», но в оригинале это HR, а не RR: «HR 0.76, 95% CI 0.58–0.99»",
    "Границы ДИ перепутаны: в оригинале 1.09–3.05, в переводе 1,90; 3,05",
    "«calcitonin gene-related peptide receptor agonist» переведён как антагонист",
  ]) assert.ok(!isIntervalFormatNitpick(t), t);
});

console.log(`${passed} тестов пройдено${process.exitCode ? ', есть падения' : ''}`);

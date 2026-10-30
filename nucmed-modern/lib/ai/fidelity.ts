/**
 * Проверка верности пересказа исходнику — защита от галлюцинаций.
 *
 * Чистая функция: без БД и сети. Её вызывает конвейер обработки
 * (lib/ai/process-article.ts) перед сохранением; регрессионные тесты —
 * scripts/test-fidelity.ts.
 *
 * Перенесено из Neuro 2.0 (2026-10-29) и дополнено для ветеринарии: доза или
 * концентрация не из исходника — брак даже поодиночке (выдуманная доза опаснее
 * пропущенной статьи).
 *
 * Откуда правила — разбор базы neuro-pulse.news (2026-09-26, 2344 статьи):
 *   - пустой оригинал → модель «заполняла шаблон» и выдумывала результаты
 *     (n, ОР, ДИ, p) по одному заголовку;
 *   - анонс из RSS в 1–3 предложения → статья в 2 тыс. знаков с додуманными
 *     «Методологией» и «Клиническим значением» и оговорками «по-видимому…».
 * Правила консервативные: лучше отправить статью на ручную проверку, чем
 * опубликовать выдуманные цифры.
 */

export interface FidelityInput {
  /** Исходный текст: оригинал, аннотация, заголовок (HTML допускается). Повторы не суммируются. */
  source: string | string[];
  /** Сгенерированный текст статьи (markdown). */
  output: string;
  /**
   * Текст сделан промптом, который требовал разделы всегда (старый портал):
   * короткий исходник + ≥3 разделов — брак без порога раздувания.
   */
  strictTemplate?: boolean;
  /**
   * Порог «нет исходника» (по умолчанию 150 зн.). Ниже — только для анонса видео и подкастов
   * по карточке (формат, название, площадка): там короткий исходник — норма, раздувание
   * по-прежнему ловит правило ×3.
   */
  minSourceChars?: number;
}

export type FidelityIssueCode =
  | "no-source" | "inflated" | "invented-numbers" | "invented-dose" | "speculation" // содержание: додумано
  | "raw-json" | "incomplete" | "garbled"; // сбой генерации: повтор обычно исправляет

/** Сбои генерации, а не домысел: конвейер отправляет статью на повторную обработку. */
export const RETRYABLE_ISSUES: ReadonlySet<FidelityIssueCode> = new Set(["raw-json", "incomplete", "garbled"]);

export function onlyRetryable(issues: FidelityIssue[]): boolean {
  return issues.length > 0 && issues.every((i) => RETRYABLE_ISSUES.has(i.code));
}

export interface FidelityIssue {
  code: FidelityIssueCode;
  detail: string;
}

export interface FidelityResult {
  ok: boolean;
  issues: FidelityIssue[];
  /** Для лога и отладки порогов. */
  stats: { sourceChars: number; outputChars: number; numbers: number; unsupportedNumbers: string[]; unsupportedDoses: string[] };
}

/** Ниже этого исходник — только анонс: пересказ не может быть длиннее ×INFLATION. */
const SHORT_SOURCE_CHARS = 1500;
const INFLATION = 3;
/** Короткий исходник не даёт материала на разделы «Методология»/«Клиническое значение». */
const TEMPLATE_SOURCE_CHARS = 1000;
const MAX_SECTIONS_FOR_SHORT_SOURCE = 2;
const TEMPLATE_INFLATION = 2.5;
/** Перевод длинного абстракта короче этой доли — результаты выпали. */
const INCOMPLETE_SOURCE_CHARS = 1500;
const INCOMPLETE_SHARE = 0.4;
/**
 * Длиннее — полный текст статьи, а не аннотация: модель делает изложение главного
 * (промпт в process-article.ts), поэтому «неполный перевод» не проверяем — короче
 * оригинала изложение по определению (выборка 05.10: EFIC 7,6 тыс. зн., «Лечащий врач» 46 тыс.).
 */
export const FULLTEXT_SOURCE_CHARS = 6000;
/** Пустой исходник — отказ без разговоров. */
const MIN_SOURCE_CHARS = 150;
/** Чисел «не из оригинала» — сколько и какая доля делает текст подозрительным. */
const MAX_UNSUPPORTED_NUMBERS = 2;
const MAX_UNSUPPORTED_SHARE = 0.25;

export function stripToText(s: string): string {
  return s
    // Только настоящие теги: «P < 0.001 … > 0.05» — не тег, текст не вырезаем.
    .replace(/<\/?[a-zA-Z][^<>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Числа текста как значения. Запятая неоднозначна: в английском «2,700» — тысячи,
 * в русском «0,774» — дробь; для «d,ddd» берём оба прочтения. Пробел/узкий
 * пробел между группами — тысячи («20 000»). Одиночные цифры не считаем; знак минус
 * учитываем (−0,49 ≠ 0,49), годы сверяем как числа.
 * Возвращает варианты значений по каждому числу.
 */
type NumberToken = string[] & { inCI?: boolean };

export function extractNumberTokens(text: string): NumberToken[] {
  // Переводы строк сохраняем: по ним отличаем пункт списка «- 15» от минуса.
  const t = text
    .replace(/<\/?[a-zA-Z][^<>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/(\d)·(\d)/g, "$1.$2") // Lancet: десятичная точка по центру строки — 2·25
    .replace(/(\d{1,3})(?:[\u00a0\u202f ](\d{3}))+(?![\d,.])/g, (m) => m.replace(/[\u00a0\u202f ]/g, ""));
  const tokens: NumberToken[] = [];
  // «94/212» — два числа; дефис и слэш границами не мешают.
  for (const m of t.matchAll(/(?<![\w.,])\d+(?:[.,]\d+)*(?![\w]|[.,]\d)/g)) {
    const raw = m[0];
    // Знак минус: «−1.76», «CI − 1.80», «(**−5,8», «1.19,–0.49». Не знак: дефис в слове
    // («тау-217», «IL-6» — к минусу прилип символ слова) и диапазон («1,52–3,34»,
    // «58 -87» — ближайший значимый символ слева от тире — цифра).
    const negative = isNegative(t, m.index!);
    const alts = new Set<string>();
    if (/^\d{1,3}(,\d{3})+$/.test(raw)) alts.add(String(Number(raw.replace(/,/g, "")))); // 2,700 → 2700
    if (/^\d+,\d+$/.test(raw)) alts.add(String(Number(raw.replace(",", ".")))); // 0,774 → 0.774
    if (/^\d+(\.\d+)?$/.test(raw)) alts.add(String(Number(raw)));
    if (/^\d{1,3}(\.\d{3})+$/.test(raw)) alts.add(String(Number(raw.replace(/\./g, "")))); // 1.000 (рус. тыс.)
    const vals = [...alts].filter((v) => v !== "NaN");
    if (!vals.length) continue;
    // Одиночные цифры — нумерация и «2 группы», не сверяем. Годы сверяем:
    // «апрель 2024» вместо «April 2026» — искажение (аудит 2026-09-26).
    if (vals.every((v) => /^\d$/.test(v))) continue;
    tokens.push(Object.assign(negative ? vals.map((v) => `-${v}`) : vals, { inCI: /(ДИ|CI)(?![\p{L}\d])[^;\n]{0,40}$/iu.test(t.slice(Math.max(0, m.index! - 45), m.index!)) }));
  }
  return tokens;
}

function isNegative(t: string, at: number): boolean {
  let i = at - 1;
  while (i >= 0 && t[i] === " ") i--; // «− 1.80»
  if (i < 0 || !/[-−–]/.test(t[i])) return false;
  if (i < at - 1 && (i === 0 || t[i - 1] === "\n")) return false; // «- 15 исследований» — пункт списка
  const glued = i > 0 ? t[i - 1] : "";
  if (/[\p{L}\d]/u.test(glued)) return false; // «тау-217», «1,52–3,34»
  let j = i - 1;
  while (j >= 0 && /[\s*_]/.test(t[j])) j--; // пробелы и markdown
  return !(j >= 0 && /\d/.test(t[j])); // «58 -87» — диапазон
}

/**
 * Числа, за которыми идёт единица дозы или концентрации: «0,1 мг/кг», «5 mg/kg», «20 МЕ»,
 * «2 мл», «10 мкг», «1:1000». В ветеринарии это самое опасное место для домысла.
 * Возвращает значения так же, как extractNumberTokens (варианты прочтения через «|»).
 */
const DOSE_UNIT =
  /^\s*(?:мг|мкг|нг|г|кг|мл|л|ме|ед|ммоль|мэкв|mg|mcg|µg|μg|ug|ng|g|ml|mL|l|iu|IU|u|U|mmol|meq|mEq|%)(?:\s*\/\s*(?:кг|kg|м2|m2|м²|m²|сут|day|d|ч|h|час|мл|ml|л|l))?(?![\p{L}])/iu;

export function extractDoseTokens(text: string): string[][] {
  const t = text.replace(/<\/?[a-zA-Z][^<>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/(\d)·(\d)/g, "$1.$2");
  const out: string[][] = [];
  for (const m of t.matchAll(/(?<![\w.,])(\d+(?:[.,]\d+)?)(?![\w]|[.,]\d)/g)) {
    const after = t.slice(m.index! + m[0].length, m.index! + m[0].length + 12);
    if (!DOSE_UNIT.test(after) || after.trimStart().startsWith("%")) continue; // проценты сверяются как обычные числа
    const raw = m[1];
    const alts = new Set<string>([String(Number(raw.replace(",", ".")))]);
    if (/^\d{1,3},\d{3}$/.test(raw)) alts.add(String(Number(raw.replace(",", ""))));
    out.push([...alts]);
  }
  return out;
}

export function extractNumbers(text: string): Set<string> {
  return new Set(extractNumberTokens(text).flat());
}

function derivedPercents(nums: Set<string>): Set<string> {
  const vals = [...nums].map(Number).filter((v) => Number.isInteger(v) && v > 0 && v < 1e6).slice(0, 80);
  const out = new Set<string>();
  for (const a of vals) for (const b of vals) {
    if (a >= b) continue;
    const p = (a / b) * 100;
    out.add(String(Math.round(p))).add(String(Math.round(p * 10) / 10)).add(String(Math.round(p * 100) / 100));
  }
  return out;
}

// Оговорки-догадки. «по-видимому» бывает честным переводом «appears to» —
// засчитываем его, только если в оригинале нет осторожной формулировки.
const HEDGES = [/по-видимому/i, /предположительно/i];
const SOURCE_HEDGE = /\b(appear|seem|likely|probabl|presum|putative|suggest|may|might|could|possibl)/i;
// Домысел о самой работе и о недостающих данных — всегда брак.
const SPECULATION = [
  /(исследование|работа|анализ)[^.]{0,40}\bвероятно\b/i,
  /\bвероятно,? (включал|использовал|проводил|основывал|фокусировал)/i,
  /(полный текст|полные данные|детали|подробности|методолог\w*)[^.]{0,60}(недоступн|не (указан|привед|предоставл|раскрыт|описан))/i,
  /(в|из) (исходн|предоставленн)\w+ (текст|материал|фрагмент|аннотац)\w*[^.]{0,40}(не|недостаточно)/i,
  /(к сожалению|не представляется возможным)/i,
  // Рекомендации и «значение для практики», которых нет в источнике, проверяет фактчекер;
  // здесь — только явные признаки домысла о самой работе.
];

/** Склеивает части исходника, не считая дважды аннотацию, повторяющую текст (RSS). */
function joinSource(parts: string | string[]): string {
  const uniq: string[] = [];
  for (const p of (Array.isArray(parts) ? parts : [parts]).map(stripToText).filter(Boolean).sort((a, b) => b.length - a.length)) {
    const probe = p.slice(0, 200);
    if (!uniq.some((u) => u.includes(probe))) uniq.push(p);
  }
  return uniq.join("\n");
}

export function checkFidelity({ source: sourceParts, output, strictTemplate = false, minSourceChars = MIN_SOURCE_CHARS }: FidelityInput): FidelityResult {
  const source = joinSource(sourceParts);
  const src = source;
  const out = stripToText(output);
  const issues: FidelityIssue[] = [];

  if (/^\s*```(json)?|^\s*\{\s*"title"/.test(output) || /"\s*\}?\s*,?\s*\n?\s*"(category|tags|significanceScore|excerpt|title|content|nosologies)"\s*:/.test(output)) {
    issues.push({ code: "raw-json", detail: "в тексте сырой JSON ответа модели" });
  }
  // Склейки «холинэстеrazы», «какpromising» — модель сбилась на полуслове.
  const garbled = output.match(/[а-яё]{2,}[a-z]{3,}|[a-z]{3,}[а-яё]{2,}/gi);
  if (garbled) {
    issues.push({ code: "garbled", detail: `склейки кириллицы и латиницы: ${[...new Set(garbled)].slice(0, 4).join(", ")}` });
  }

  if (src.length < minSourceChars) {
    issues.push({ code: "no-source", detail: `исходного текста ${src.length} зн. — пересказывать нечего` });
  } else if (src.length < SHORT_SOURCE_CHARS && out.length > src.length * INFLATION) {
    issues.push({ code: "inflated", detail: `исходник ${src.length} зн., текст ${out.length} зн. (×${(out.length / src.length).toFixed(1)}) — додумано сверх источника` });
  } else if (
    src.length < TEMPLATE_SOURCE_CHARS &&
    (strictTemplate || out.length > src.length * TEMPLATE_INFLATION) &&
    (output.match(/^#{2,3} /gm)?.length ?? 0) > MAX_SECTIONS_FOR_SHORT_SOURCE
  ) {
    issues.push({ code: "inflated", detail: `исходник ${src.length} зн., а в тексте ${output.match(/^#{2,3} /gm)!.length} разделов — шаблон заполнен сверх источника` });
  }

  if (src.length > INCOMPLETE_SOURCE_CHARS && src.length <= FULLTEXT_SOURCE_CHARS && out.length < src.length * INCOMPLETE_SHARE) {
    issues.push({ code: "incomplete", detail: `исходник ${src.length} зн., перевод ${out.length} зн. — часть текста не переведена` });
  }

  const srcNums = extractNumbers(source);
  // Проценты, которые модель честно посчитала из чисел оригинала (2229 из 3016 → 73,9%).
  const derived = derivedPercents(srcNums);
  const outTokens = extractNumberTokens(output);
  const seen = new Set<string>();
  const outNums: string[] = [];
  const unsupported: string[] = [];
  const ciUnsupported: string[] = [];
  for (const alts of outTokens) {
    const key = alts.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    outNums.push(alts[0]);
    if (!alts.some((v) => srcNums.has(v) || derived.has(v))) {
      unsupported.push(alts[0]);
      if (alts.inCI) ciUnsupported.push(alts[0]);
    }
  }
  // Потерянный/лишний минус в доверительном интервале и чужой год опасны даже
  // поодиночке — без порога. Вне ДИ знак часто передан словами («снижение на 31%»).
  const signFlips = ciUnsupported.filter((v) => srcNums.has(v.startsWith("-") ? v.slice(1) : `-${v}`));
  if (signFlips.length) {
    issues.push({ code: "invented-numbers", detail: `знак в ДИ не как в оригинале: ${signFlips.slice(0, 4).join(", ")}` });
  }
  const srcHasYears = [...srcNums].some((v) => /^(19|20)\d\d$/.test(v));
  const wrongYears = srcHasYears ? unsupported.filter((v) => /^(19|20)\d\d$/.test(v)) : [];
  if (wrongYears.length) {
    issues.push({ code: "invented-numbers", detail: `годы не из оригинала: ${wrongYears.slice(0, 4).join(", ")}` });
  }
  // Доза/концентрация не из исходника — брак без порога: в ветеринарии это прямой вред.
  // Дозы бывают однозначными («5 mg/kg») — extractNumbers их пропускает, поэтому для доз
  // сверяемся со всеми числами исходника, включая одиночные цифры.
  const srcAll = new Set<string>(srcNums);
  for (const m of stripToText(source).replace(/(\d)·(\d)/g, "$1.$2").matchAll(/\d+(?:[.,]\d+)?/g)) {
    srcAll.add(String(Number(m[0].replace(",", "."))));
    if (/^\d{1,3},\d{3}$/.test(m[0])) srcAll.add(String(Number(m[0].replace(",", ""))));
  }
  const unsupportedDoses = [...new Set(extractDoseTokens(output).filter((alts) => !alts.some((v) => srcAll.has(v))).map((alts) => alts[0]))];
  if (unsupportedDoses.length) {
    issues.push({ code: "invented-dose", detail: `дозы/концентрации не из оригинала: ${unsupportedDoses.slice(0, 6).join(", ")}` });
  }
  if (unsupported.length > MAX_UNSUPPORTED_NUMBERS && unsupported.length / Math.max(1, outNums.length) > MAX_UNSUPPORTED_SHARE) {
    issues.push({ code: "invented-numbers", detail: `чисел нет в оригинале: ${unsupported.slice(0, 8).join(", ")}${unsupported.length > 8 ? "…" : ""}` });
  }

  const spec = [...SPECULATION, ...(SOURCE_HEDGE.test(src) ? [] : HEDGES)].map((re) => out.match(re)?.[0]).filter(Boolean) as string[];
  if (spec.length) {
    issues.push({ code: "speculation", detail: `оговорки-догадки: «${spec.slice(0, 2).join("», «")}»` });
  }

  return {
    ok: issues.length === 0,
    issues,
    stats: { sourceChars: src.length, outputChars: out.length, numbers: outNums.length, unsupportedNumbers: unsupported, unsupportedDoses },
  };
}

export function formatFidelityIssues(issues: FidelityIssue[]): string {
  return issues.map((i) => `${i.code}: ${i.detail}`).join("; ");
}

/**
 * Сверка пересказа с оригиналом моделью-фактчекером — второй эшелон защиты
 * от галлюцинаций после правил lib/ai/fidelity.ts.
 *
 * Правила ловят числа, дозы, раздувание и оговорки; фактчекер — то, что правилам
 * не видно: дописанные выводы и рекомендации, искажённое направление эффекта,
 * подменённый препарат или вид животного, пропуск ключевого результата.
 * Схема перенесена из Neuro 2.0 (их аудит: 3 из 30 статей, прошедших правила,
 * были с такими ошибками).
 *
 * ≈ $0.02 за статью на общем с онкокомпасом и Neuro 2.0 ключе Replicate.
 * Выключается в system_config: fact_check_enabled = false.
 */
import { callReplicateAI, DEFAULT_TEXT_MODEL } from "@/lib/ai/replicate";
import { parsePartialJson } from "@/lib/utils/json";
import { stripToText } from "@/lib/ai/fidelity";

export const FACT_CHECK_SYSTEM_PROMPT = `Ты — редактор-фактчекер ветеринарного портала для врачей. Сравни ОРИГИНАЛ (аннотация или текст научной статьи, обычно на английском) и ПЕРЕСКАЗ на русском.
Найди только существенные проблемы пересказа:
- утверждения, факты или числа в пересказе, которых НЕТ в оригинале (домысел), в том числе собственные выводы, рекомендации, «практическая польза» и «значение для клиники», если их нет у авторов;
- искажение: неверное число, доза, единица, концентрация, путь введения, вид или порода животного, название препарата, метода или шкалы, направление эффекта, значимость, дизайн исследования, размер выборки; объединение значений разных показателей в один диапазон;
- пропуск ключевого результата или вывода оригинала.
Если в оригинале явная опечатка, пересказ должен воспроизвести оригинал как есть — «исправление» считай искажением.
Даты и годы оригинала НЕ оценивай на правдоподобие (твои знания о текущей дате устарели): проверяй только, что в пересказе они те же.
НЕ считай проблемой: стиль, порядок, заголовки, раскрытие аббревиатур, пересказ общими словами того, что есть в оригинале, запись интервалов («1.32–11.77» = «1,32; 11,77» = «от 1,32 до 11,77»), десятичную запятую вместо точки, перевод названий видов на русский.
Ответ строго JSON: {"verdict":"ok"|"minor"|"major","issues":[{"type":"added|distorted|omitted","text":"кратко, с цитатой"}]}
major — есть домысел или искажение, способное ввести ветеринарного врача в заблуждение (особенно дозы, препараты, виды животных); minor — мелкая неточность; ok — проблем нет.`;

export type FactCheckVerdict = "ok" | "minor" | "major";

export interface FactCheckResult {
  verdict: FactCheckVerdict;
  issues: { type: string; text: string }[];
  costUsd: number;
  model: string;
}

// Замечания только о записи доверительного интервала — придирки, а не искажение
// (Neuro 2.0: ~10% отказов фактчекера были такими). Отбрасываем, если в замечании
// нет претензии к самим числам.
const INTERVAL_TOPIC = /(ДИ|\bCI\b|интервал)/i;
const FORMAT_ONLY = /(точк\S* с запятой|вместо (тире|дефиса|диапазона)|пропущено тире|вместо [«'"]?\d[\d.,]*[–-]\d|отдельн\S* (цифр|значени|точк)|перечислени|через [«'"]?;)/i;
const REAL_DISTORTION = /(знак|неверн|не совпада|друго[ей] (числ|значени)|перепутан|добавлен|пропущен (результат|вывод)|направлени|(HR|OR|RR|ОР|ОШ)(?![A-Za-zА-Яа-я])[^;]{0,60}(а не|замен)|(а не|вместо|замен\S*)\s+[«'"]?(HR|OR|RR|ОР|ОШ)(?![A-Za-zА-Яа-я]))/i;

export function isIntervalFormatNitpick(text: string): boolean {
  const claim = text.replace(/[«'"][^»'"]*[»'"]/g, " ");
  return INTERVAL_TOPIC.test(text) && FORMAT_ONLY.test(text) && !REAL_DISTORTION.test(claim);
}

export async function factCheckArticle(input: {
  titleOriginal: string;
  source: string;
  title: string;
  excerpt?: string | null;
  content: string;
  model?: string;
}): Promise<FactCheckResult> {
  // Тот же объём исходника, что видела модель-редактор (process-article: 12 000 зн.)
  const prompt = `ОРИГИНАЛ:\n${input.titleOriginal}\n${stripToText(input.source).slice(0, 12000)}\n\nПЕРЕСКАЗ:\n${input.title}\n${input.excerpt ?? ""}\n${input.content}`;
  // Сегодняшняя дата — иначе модель считает текущий год «будущим» и помечает верные даты как искажение
  const systemPrompt = `${FACT_CHECK_SYSTEM_PROMPT}\nСегодня ${new Date().toISOString().slice(0, 10)}.`;
  const res = await callReplicateAI(prompt, (input.model as typeof DEFAULT_TEXT_MODEL) ?? DEFAULT_TEXT_MODEL, { systemPrompt, maxTokens: 1500 });
  const out = parsePartialJson(res.output) as { verdict?: string; issues?: { type?: string; text?: string }[] };
  const verdict = out.verdict === "ok" || out.verdict === "minor" || out.verdict === "major" ? out.verdict : null;
  // Непонятный ответ — не «ok»: без проверки статья не проходит
  if (!verdict) throw new Error(`FactCheck: unparseable verdict: ${res.output.slice(0, 200)}`);
  const all = (out.issues ?? []).map((i) => ({ type: String(i.type ?? ""), text: String(i.text ?? "") }));
  const issues = all.filter((i) => !isIntervalFormatNitpick(i.text));
  return {
    verdict: all.length > 0 && issues.length === 0 ? "ok" : verdict,
    issues,
    costUsd: res.costUsd ?? 0,
    model: res.model,
  };
}

export function formatFactCheckIssues(r: FactCheckResult): string {
  return r.issues.map((i) => `${i.type}: ${i.text}`).join("; ").slice(0, 900);
}

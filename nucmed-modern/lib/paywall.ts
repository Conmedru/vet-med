/**
 * Обрезка текста закрытого материала (ТЗ п.1: «Неавторизованный пользователь
 * видит первые 1500 знаков, ниже материал скрывается плашкой»).
 *
 * Выполняется на сервере, до передачи в ReactMarkdown — усечённый markdown
 * уходит клиенту, полный текст никогда не попадает в HTML/RSC payload для
 * неавторизованного посетителя. Это принципиально: обрезка на клиенте
 * (например, через max-height + overlay) была бы обходима через просмотр
 * исходного кода страницы.
 */
export const PAYWALL_FREE_CHARS = 1500;

export function truncateForPaywall(markdown: string, limit: number = PAYWALL_FREE_CHARS): string {
  if (markdown.length <= limit) return markdown;

  let cut = markdown.slice(0, limit);
  const lastParagraphBreak = cut.lastIndexOf("\n\n");
  const lastSpace = cut.lastIndexOf(" ");

  // Предпочитаем резать по границе абзаца, если она недалеко от лимита —
  // иначе просто по границе слова, чтобы не разрывать его посередине.
  if (lastParagraphBreak > limit * 0.6) {
    cut = cut.slice(0, lastParagraphBreak);
  } else if (lastSpace > limit * 0.8) {
    cut = cut.slice(0, lastSpace);
  }

  return cut.trimEnd();
}

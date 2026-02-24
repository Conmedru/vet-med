/**
 * SEO-friendly slug generation
 * Поддержка кириллицы с транслитерацией
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/**
 * Транслитерация кириллицы в латиницу
 */
function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

/**
 * Генерация slug из текста
 * @param text - исходный текст (title статьи)
 * @param maxLength - максимальная длина slug (по умолчанию 80)
 */
export function generateSlug(text: string, maxLength = 80): string {
  return transliterate(text)
    .trim()
    .replace(/[^\w\s-]/g, "") // Убираем спецсимволы
    .replace(/[\s_]+/g, "-")   // Пробелы в дефисы
    .replace(/-+/g, "-")       // Множественные дефисы в один
    .replace(/^-+|-+$/g, "")   // Убираем дефисы по краям
    .slice(0, maxLength)
    .replace(/-+$/, "");       // Убираем дефис в конце после slice
}

/**
 * Генерация уникального slug с добавлением суффикса при дубликатах
 * @param baseSlug - базовый slug
 * @param existingSlugs - Set существующих slug'ов
 */
export function ensureUniqueSlug(
  baseSlug: string,
  existingSlugs: Set<string>
): string {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Генерация slug с датой для гарантированной уникальности
 * Формат: yyyy-mm-dd-slug-text
 */
export function generateSlugWithDate(text: string, date?: Date): string {
  const d = date || new Date();
  const datePrefix = d.toISOString().split("T")[0]; // yyyy-mm-dd
  const textSlug = generateSlug(text, 60);
  return `${datePrefix}-${textSlug}`;
}

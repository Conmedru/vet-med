/**
 * Справочник ветеринарных специальностей для формы регистрации (ТЗ клиента, п. 13).
 * Slug совпадает со slug рубрики-специализации в lib/rubrics.ts: по нему при
 * регистрации настраивается персональная лента. Значение "other" открывает свободное поле.
 */

export interface Specialty {
  slug: string;
  name: string;
}

export const PRIORITY_SPECIALTIES: Specialty[] = [
  { slug: "therapy", name: "Ветеринарный врач общей практики (терапевт)" },
  { slug: "surgery", name: "Хирургия" },
  { slug: "anesthesiology", name: "Анестезиология-реаниматология" },
  { slug: "dermatology", name: "Дерматология" },
  { slug: "ophthalmology", name: "Офтальмология" },
  { slug: "cardiology", name: "Кардиология" },
  { slug: "neurology", name: "Неврология" },
  { slug: "oncology", name: "Онкология" },
  { slug: "nephrology-urology", name: "Нефрология и урология" },
  { slug: "gastroenterology", name: "Гастроэнтерология" },
  { slug: "endocrinology", name: "Эндокринология" },
  { slug: "dentistry", name: "Стоматология" },
  { slug: "orthopedics", name: "Ортопедия" },
  { slug: "epidemiology", name: "Эпидемиология" },
  { slug: "rehabilitation", name: "Реабилитология" },
];

export const OTHER_SPECIALTIES: Specialty[] = [];

export const OTHER_SPECIALTY_SLUG = "other";

export const SPECIALTIES: Specialty[] = [
  ...PRIORITY_SPECIALTIES,
  ...OTHER_SPECIALTIES,
  { slug: OTHER_SPECIALTY_SLUG, name: "Другое" },
];

const specialtyBySlug = new Map(SPECIALTIES.map((s) => [s.slug, s]));

export function getSpecialtyName(slug: string): string | undefined {
  return specialtyBySlug.get(slug)?.name;
}

export function isValidSpecialtySlug(slug: string): boolean {
  return specialtyBySlug.has(slug);
}

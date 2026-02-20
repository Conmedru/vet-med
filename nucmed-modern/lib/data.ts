export type Author = {
  name: string;
  avatar: string;
  role: string;
};

export type Article = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  date: string;
  author: Author;
  category: Category;
  readTime: string;
  featured?: boolean;
  trending?: boolean;
  views?: number;
};

/**
 * Animal-type categories (client requirement — main homepage sections)
 */
export const animalCategories = [
  "Питомцы",
  "Кошки",
  "Собаки",
  "Грызуны",
  "Птицы, попугаи",
  "Экзоты",
  "Сельскохозяйственные животные",
  "Нутрициология",
] as const;

export type AnimalCategory = (typeof animalCategories)[number];

export const animalCategoryGroups: Record<string, string[]> = {
  "Питомцы": ["Кошки", "Собаки", "Грызуны", "Птицы, попугаи"],
  "Экзоты": [],
  "Сельскохозяйственные животные": [],
  "Нутрициология": [],
};

/**
 * Veterinary medicine specialties
 */
export const nosologies = [
  "Хирургия",
  "Терапия",
  "Кардиология",
  "Онкология",
  "Дерматология",
  "Офтальмология",
  "Ортопедия",
  "Стоматология",
  "Неврология",
  "Анестезиология",
  "Репродукция",
  "Диетология",
] as const;

export type Nosology = (typeof nosologies)[number];

export const specialSections = [
  "Инфекционные болезни",
  "Паразитология",
  "Лабораторная диагностика",
  "Визуальная диагностика",
  "Фармакология",
  "Реабилитация",
  "Неотложная помощь",
  "Поведенческая медицина",
  "Ветеринарное законодательство",
] as const;

export type SpecialSection = (typeof specialSections)[number];

export type Category = AnimalCategory | Nosology | SpecialSection;

export const categories: Category[] = [...animalCategories, ...nosologies, ...specialSections];

export const categorySlugMap: Record<Category, string> = {
  "Питомцы": "pets",
  "Кошки": "cats",
  "Собаки": "dogs",
  "Грызуны": "rodents",
  "Птицы, попугаи": "birds",
  "Экзоты": "exotics",
  "Сельскохозяйственные животные": "farm-animals",
  "Нутрициология": "nutrition",
  "Хирургия": "surgery",
  "Терапия": "therapy",
  "Кардиология": "cardiology",
  "Онкология": "oncology",
  "Дерматология": "dermatology",
  "Офтальмология": "ophthalmology",
  "Ортопедия": "orthopedics",
  "Стоматология": "dentistry",
  "Неврология": "neurology",
  "Анестезиология": "anesthesiology",
  "Репродукция": "reproduction",
  "Диетология": "dietology",
  "Инфекционные болезни": "infectious-diseases",
  "Паразитология": "parasitology",
  "Лабораторная диагностика": "lab-diagnostics",
  "Визуальная диагностика": "imaging",
  "Фармакология": "pharmacology",
  "Реабилитация": "rehabilitation",
  "Неотложная помощь": "emergency",
  "Поведенческая медицина": "behavioral-medicine",
  "Ветеринарное законодательство": "vet-law",
};

export const slugToCategoryMap: Record<string, Category> = Object.entries(categorySlugMap).reduce(
  (acc, [category, slug]) => ({ ...acc, [slug]: category as Category }),
  {} as Record<string, Category>
);

export function getCategorySlug(category: Category | string): string {
  return categorySlugMap[category as Category] || category.toLowerCase().replace(/\s+/g, "-");
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return slugToCategoryMap[slug];
}

export function isSpecialSection(category: string): boolean {
  return (specialSections as readonly string[]).includes(category);
}

export function isNosology(category: string): boolean {
  return (nosologies as readonly string[]).includes(category);
}

export function isAnimalCategory(category: string): boolean {
  return (animalCategories as readonly string[]).includes(category);
}

export const SITE = {
  NAME: 'VetMed',
  NAME_EN: 'vetmed',
  URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://vetmed.ru',
  LOCALE: 'ru-RU',
} as const;

export const ANIMAL_CATEGORIES = [
  'Питомцы',
  'Кошки',
  'Собаки',
  'Грызуны',
  'Птицы',
  'Экзоты',
  'Сельскохозяйственные животные',
  'Нутрициология',
] as const;

export const NOSOLOGIES = [
  'Хирургия',
  'Терапия',
  'Кардиология',
  'Онкология',
  'Дерматология',
  'Офтальмология',
  'Ортопедия',
  'Стоматология',
  'Неврология',
  'Анестезиология',
  'Репродукция',
  'Диетология',
] as const;

export const SPECIAL_SECTIONS = [
  'Инфекционные болезни',
  'Паразитология',
  'Лабораторная диагностика',
  'Визуальная диагностика',
  'Фармакология',
  'Реабилитация',
  'Неотложная помощь',
  'Поведенческая медицина',
  'Ветеринарное законодательство',
] as const;

export const CATEGORIES = [...ANIMAL_CATEGORIES, ...NOSOLOGIES, ...SPECIAL_SECTIONS] as const;

export const SOCIAL = {
  FACEBOOK: 'https://facebook.com/vetmed',
  TWITTER: 'https://twitter.com/vetmed',
  LINKEDIN: 'https://linkedin.com/company/vetmed',
  INSTAGRAM: 'https://instagram.com/vetmed',
} as const;

export const CONTACT = {
  EMAIL: 'info@vetmed.ru',
  PHONE: '+7 (495) 000-00-00',
  ADDRESS: 'Москва, Россия',
} as const;

export const PAGINATION = {
  SIDEBAR_ARTICLES: 20,
  FEATURED_ARTICLES: 5,
  TRENDING_ARTICLES: 10,
  NEWS_PAGE_SIZE: 12,
} as const;

export const CACHE = {
  STATS_REVALIDATE: 3600, // 1 hour
  ARTICLES_REVALIDATE: 60, // 1 minute
} as const;

export const CONTENT = {
  MIN_SIGNIFICANCE_SCORE: 0.6,
  WORDS_PER_MINUTE: 200,
} as const;

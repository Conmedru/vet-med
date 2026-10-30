/**
 * Rubric taxonomy — single source of truth for menu, AI classification and article filtering.
 * Articles store rubric slugs in Article.rubrics (one article can be in several rubrics).
 */

export type RubricKind = "animal" | "specialty" | "diagnostics" | "section";

export interface Rubric {
  slug: string;
  name: string;
  kind: RubricKind;
  /** Short name for compact UI (menu) */
  shortName?: string;
  /** What belongs to the rubric — shown on the rubric page and given to the AI */
  description: string;
}

/** Video, webinars and podcasts: link-out teasers (lib/ai/process-article.ts, media path) */
export const VIDEO_SLUG = "video";

export const RUBRICS: Rubric[] = [
  // Животные
  { slug: "cats", name: "Кошки", kind: "animal", description: "Кошки (feline)." },
  { slug: "dogs", name: "Собаки", kind: "animal", description: "Собаки (canine)." },
  { slug: "rodents", name: "Грызуны", kind: "animal", description: "Мыши, крысы, хомяки, морские свинки, декоративные кролики, хорьки." },
  { slug: "birds", name: "Птицы, попугаи", kind: "animal", description: "Декоративные и домашние птицы: попугаи, канарейки и т. п. Не птицеводство." },
  { slug: "exotics", name: "Экзоты", kind: "animal", description: "Рептилии, амфибии, паукообразные, рыбы, дикие и зоопарковые животные." },
  {
    slug: "farm-animals",
    name: "Сельскохозяйственные животные",
    shortName: "С/х животные",
    kind: "animal",
    description: "КРС, свиньи, мелкий рогатый скот, лошади, птицеводство (куры, утки, индейки), кролиководство, аквакультура.",
  },

  // Специализации
  { slug: "therapy", name: "Общая ветеринария (терапия)", shortName: "Общая ветеринария", kind: "specialty", description: "Первичный приём, диагностика и лечение распространённых болезней, базовые назначения." },
  { slug: "surgery", name: "Хирургия", kind: "specialty", description: "Плановые и экстренные операции, травматология, ортопедические вмешательства." },
  { slug: "anesthesiology", name: "Анестезиология-реаниматология", kind: "specialty", description: "Подготовка к наркозу, контроль состояния во время операций, работа в реанимации." },
  { slug: "dermatology", name: "Дерматология", kind: "specialty", description: "Болезни кожи, аллергии, паразитарные поражения, хронические кожные состояния." },
  { slug: "ophthalmology", name: "Офтальмология", kind: "specialty", description: "Заболевания глаз: травмы, катаракта, глаукома, воспаления." },
  { slug: "cardiology", name: "Кардиология", kind: "specialty", description: "Патологии сердца и сосудов, нарушения ритма, сердечная недостаточность." },
  { slug: "neurology", name: "Неврология", kind: "specialty", description: "Поражения нервной системы, судороги, травмы спинного мозга, нарушения координации." },
  { slug: "oncology", name: "Онкология", kind: "specialty", description: "Диагностика и лечение опухолей, планирование терапии (в том числе совместно с хирургами и радиологами)." },
  { slug: "nephrology-urology", name: "Нефрология и урология", kind: "specialty", description: "Болезни почек и мочевыводящих путей, мочекаменная болезнь, почечная недостаточность." },
  { slug: "gastroenterology", name: "Гастроэнтерология", kind: "specialty", description: "Заболевания ЖКТ: от расстройств пищеварения до хронических патологий печени и поджелудочной железы." },
  { slug: "endocrinology", name: "Эндокринология", kind: "specialty", description: "Гормональные нарушения: сахарный диабет, болезни щитовидной железы, надпочечников, репродуктивные эндокринные проблемы." },
  { slug: "dentistry", name: "Стоматология", kind: "specialty", description: "Лечение зубов и ротовой полости, удаление зубов, чистка зубного камня, исправление прикуса." },
  { slug: "orthopedics", name: "Ортопедия", kind: "specialty", description: "Заболевания и травмы опорно-двигательного аппарата, часто пересекается с хирургией." },
  { slug: "epidemiology", name: "Эпидемиология", kind: "specialty", description: "Изучение вспышек болезней, контроль заразных заболеваний, карантинные мероприятия." },
  { slug: "rehabilitation", name: "Реабилитология", kind: "specialty", description: "Восстановление после травм и операций: физиотерапия, гидротерапия, ЛФК." },

  // Методы диагностики
  { slug: "ultrasound", name: "УЗИ", kind: "diagnostics", description: "Оценка внутренних органов, мягких тканей, сердца (эхокардиография)." },
  { slug: "radiology", name: "Рентгенология", kind: "diagnostics", description: "Интерпретация рентгенограмм, КТ, иногда МРТ." },
  { slug: "lab-diagnostics", name: "Лабораторная диагностика", kind: "diagnostics", description: "Анализ крови, мочи, цитология, микробиология, ПЦР и др." },
  { slug: "histology", name: "Гистология", kind: "diagnostics", description: "Изучение тканей и клеток." },
  { slug: "genetics", name: "Генетика", kind: "diagnostics", description: "Анализ наследственных заболеваний, подбор пар для разведения, генетические тесты." },

  // Разделы главного меню
  { slug: "nutrition", name: "Нутрициология", kind: "section", description: "Кормление, питание, диеты, кормовые добавки." },
  { slug: "vaccination", name: "Вакцинация", kind: "section", description: "Вакцины, схемы и эффективность вакцинации, поствакцинальные реакции." },
  { slug: "clinical-cases", name: "Клинические случаи", kind: "section", description: "Описания конкретных клинических случаев и серий случаев (case report)." },
  { slug: VIDEO_SLUG, name: "Видео", kind: "section", description: "Видеолекции, вебинары и подкасты: короткий анонс, смотреть и слушать — в источнике." },
];

/** Rubrics set only by the source (adapterConfig.defaultRubrics), never by the AI classifier */
const SOURCE_ONLY_SLUGS = new Set([VIDEO_SLUG]);

export const RUBRIC_KIND_LABELS: Record<RubricKind, string> = {
  animal: "Животные",
  specialty: "Специализации",
  diagnostics: "Методы диагностики",
  section: "Разделы",
};

/** Companion animals — "Питомцы" group page */
export const PET_SLUGS = ["cats", "dogs", "rodents", "birds"];

/** Non-farm animals: an article with any of them is not hidden as farm-only */
export const NON_FARM_ANIMAL_SLUGS = [...PET_SLUGS, "exotics"];

export const FARM_SLUG = "farm-animals";

const bySlug = new Map(RUBRICS.map((r) => [r.slug, r]));

export function getRubric(slug: string): Rubric | undefined {
  return bySlug.get(slug);
}

export function getRubricsByKind(kind: RubricKind): Rubric[] {
  return RUBRICS.filter((r) => r.kind === kind);
}

/** Article is about farm animals only — hidden everywhere except the farm-animals rubric */
export function isFarmOnly(rubrics: string[]): boolean {
  return rubrics.includes(FARM_SLUG) && !rubrics.some((s) => NON_FARM_ANIMAL_SLUGS.includes(s));
}

/** Keep only known slugs of the given kind, in the given order (the AI lists the most relevant first) */
export function filterRubricSlugs(slugs: unknown, kind?: RubricKind): string[] {
  if (!Array.isArray(slugs)) return [];
  const result: string[] = [];
  for (const value of slugs) {
    if (typeof value !== "string") continue;
    const slug = value.trim().toLowerCase();
    const rubric = getRubric(slug);
    if (rubric && (!kind || rubric.kind === kind) && !result.includes(slug)) result.push(slug);
  }
  return result;
}

/** Main rubric of an article: first specialty, else first animal, else first rubric */
export function primaryRubric(rubrics: string[]): Rubric | undefined {
  const known = rubrics.map(getRubric).filter((r): r is Rubric => !!r);
  return known.find((r) => r.kind === "specialty") || known.find((r) => r.kind === "animal") || known[0];
}

/** Display label for an article (stored in Article.category) */
export function primaryRubricName(rubrics: string[]): string | null {
  const rubric = primaryRubric(rubrics);
  return rubric ? rubric.shortName || rubric.name : null;
}

/** Article rubrics as known Rubric objects, in taxonomy order */
export function articleRubrics(rubrics: string[] | null | undefined): Rubric[] {
  const set = new Set(rubrics || []);
  return RUBRICS.filter((r) => set.has(r.slug));
}

/**
 * Old single-category values (Article.category) → rubric slugs.
 * Used for the initial backfill and redirects of retired category pages.
 */
export const LEGACY_CATEGORY_RUBRICS: Record<string, string[]> = {
  "Питомцы": [...PET_SLUGS],
  "Кошки": ["cats"],
  "Собаки": ["dogs"],
  "Грызуны": ["rodents"],
  "Птицы": ["birds"],
  "Птицы, попугаи": ["birds"],
  "Экзоты": ["exotics"],
  "Сельскохозяйственные животные": ["farm-animals"],
  "Нутрициология": ["nutrition"],
  "Хирургия": ["surgery"],
  "Терапия": ["therapy"],
  "Кардиология": ["cardiology"],
  "Онкология": ["oncology"],
  "Дерматология": ["dermatology"],
  "Офтальмология": ["ophthalmology"],
  "Ортопедия": ["orthopedics"],
  "Стоматология": ["dentistry"],
  "Неврология": ["neurology"],
  "Анестезиология": ["anesthesiology"],
  "Репродукция": ["endocrinology"],
  "Диетология": ["nutrition"],
  "Инфекционные болезни": ["epidemiology"],
  "Лабораторная диагностика": ["lab-diagnostics"],
  "Визуальная диагностика": ["radiology"],
  "Реабилитация": ["rehabilitation"],
  "Неотложная помощь": ["anesthesiology"],
  "Генетика": ["genetics"],
};

/** Retired category page slugs → new rubric slug */
export const LEGACY_RUBRIC_REDIRECTS: Record<string, string> = {
  "dietology": "nutrition",
  "infectious-diseases": "epidemiology",
  "imaging": "radiology",
  "emergency": "anesthesiology",
  "reproduction": "endocrinology",
  "parasitology": "all",
  "pharmacology": "all",
  "behavioral-medicine": "all",
  "vet-law": "all",
};

/**
 * Normalize the AI "rubrics" object ({animals, specialties, diagnostics, sections}) into slugs.
 * Every article gets at least one specialty: general practice when the model gave none.
 */
export function rubricsFromAI(value: unknown): string[] {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const specialties = filterRubricSlugs(v.specialties, "specialty");
  return [
    ...filterRubricSlugs(v.animals, "animal"),
    ...(specialties.length > 0 ? specialties : ["therapy"]),
    ...filterRubricSlugs(v.diagnostics, "diagnostics"),
    ...filterRubricSlugs(v.sections, "section").filter((slug) => !SOURCE_ONLY_SLUGS.has(slug)),
  ];
}

/** Classifier rubrics plus the source's fixed ones (adapterConfig.defaultRubrics), no duplicates */
export function withSourceRubrics(rubrics: string[], adapterConfig: unknown): string[] {
  const fixed = filterRubricSlugs((adapterConfig as { defaultRubrics?: unknown } | null)?.defaultRubrics);
  return [...new Set([...rubrics, ...fixed])];
}

/** Rubrics the AI may assign (prompt lists) */
export function isAiAssignable(slug: string): boolean {
  return !SOURCE_ONLY_SLUGS.has(slug);
}

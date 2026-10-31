/**
 * Журнал «Ветеринарный консилиум»: выходные данные и оглавления номеров.
 * Файлы номера (PDF, обложка, страницы для чтения онлайн) — в S3 по journalAssetKey,
 * их выкладывает scripts/publish-journal-issue.ts; запись выпуска — JournalIssue в БД.
 */

export const JOURNAL = {
  name: "Ветеринарный консилиум",
  tagline: "Научный журнал для ветеринаров",
  imprint: [
    "Периодическое сетевое издание, зарегистрировано Роскомнадзором 21.01.2026, реестровая запись ЭЛ № ФС 77 – 90595",
    "Учредитель: ООО «МЕДИАФОРМАТ»",
    "Периодичность: 4 номера в год",
    "Распространяется бесплатно · 16+",
  ],
} as const;

export interface JournalTocItem {
  page: number;
  rubric: string;
  title: string;
  /** Slug of the same story on the site, if it is there */
  articleSlug?: string;
}

export interface JournalIssueContents {
  pageCount: number;
  pdfSizeMb: number;
  lead: string;
  toc: JournalTocItem[];
}

const S3_PREFIX = process.env.S3_PREFIX || "vetmed";

export const journalAssetKey = (slug: string, name: string) => `${S3_PREFIX}/journal/${slug}/${name}`;

/** Page images sit next to the cover: …/journal/<slug>/cover.jpg → …/journal/<slug>/pages/NN.webp (thumb-NN.webp) */
export const journalPageUrl = (coverImageUrl: string, page: number, thumb = false) =>
  coverImageUrl.replace(/cover\.jpg$/, `pages/${thumb ? "thumb-" : ""}${String(page).padStart(2, "0")}.webp`);

export const JOURNAL_ISSUE_CONTENTS: Record<string, JournalIssueContents> = {
  "2026-1": {
    pageCount: 34,
    pdfSizeMb: 3.3,
    lead:
      "Первый номер: рекомендации AAHA по сахарному диабету у собак, замена ушедшему с рынка Бравекто, клинические разборы гамартомы позвоночника у кота и хилоторакса у вест-хайленд-уайт-терьера, шпаргалка WSAVA по дозировкам НПВП.",
    toc: [
      { page: 4, rubric: "Новости", title: "Искусственный интеллект предсказывает стадию B2 миксоматозной болезни митрального клапана без эхокардиографии", articleSlug: "predicting-stage-b2-myxomatous-mitral-valve-disease-in-dogs-using-machine-learning-and-routine-clinical-data" },
      { page: 4, rubric: "Новости", title: "Ветеринары развеивают мифы о хирургии морских свинок", articleSlug: "vets-debunk-guinea-pigs-reputations" },
      { page: 5, rubric: "Новости", title: "Супербактерии в хронических ранах: биопленки усиливают устойчивость к антибиотикам", articleSlug: "multidrug-resistance-and-biofilm-formation-among-bacterial-isolates-from-chronic-wounds-in-animals-evaluation-of-anti-biofilm-activity" },
      { page: 6, rubric: "События", title: "XIV Национальная ветеринарная конференция NVC 2026" },
      { page: 7, rubric: "События", title: "В Москве проходит выставка «КормВетГрэйн-2026»", articleSlug: "mezhdunarodnaya-vystavka-kormvetgreyn-2026-proydet-v-moskve-s-27-po-29-oktyabrya" },
      { page: 8, rubric: "Гайдлайны", title: "Рекомендации AAHA 2026 г. по лечению сахарного диабета у собак: основные положения", articleSlug: "aaha-updates-canine-diabetes-management-guidelines" },
      { page: 11, rubric: "Исследования", title: "Ожирение у кошек влияет на иммунную систему в зависимости от пола и возраста", articleSlug: "body-condition-age-and-sex-as-modulators-of-peripheral-blood-immune-cell-populations-and-lymphocyte-proliferation-in-cats" },
      { page: 12, rubric: "Актуальная проблема", title: "Клещи не уходят на каникулы: чем заменить ушедший с рынка препарат Бравекто" },
      { page: 14, rubric: "Клинические разборы", title: "Повторное лечение сосудистой гамартомы позвоночника у кота: редкий случай с рецидивом", articleSlug: "case-report-repeated-imaging-and-surgical-treatment-of-a-vascular-hamartoma-arising-from-the-cervical-vertebral-column-of-a-cat" },
      { page: 19, rubric: "Клинические разборы", title: "Хилоторакс у вест-хайленд-уайт-терьера: клинический случай и выбор тактики лечения" },
      { page: 20, rubric: "Письмо в редакцию", title: "Отравление догхантерами: клинический случай" },
      { page: 22, rubric: "Ветеринарная косметология", title: "Безопасность и эффективность уходовых средств для животных: разбираемся в составах" },
      { page: 24, rubric: "Зоопсихология", title: "Взаимодействие генетических факторов, стрессовых реакций и окружающей среды в адаптации животных: современный обзор" },
      { page: 27, rubric: "Алгоритмы и шпаргалки", title: "Нестероидные противовоспалительные препараты (НПВП): рекомендации WSAVA по дозировке у собак и кошек" },
      { page: 28, rubric: "Работа фондов", title: "Фонд защиты городских животных запускает разработку безопасной системы приобретения животных в России" },
      { page: 30, rubric: "Технологии", title: "Искусственный интеллект на страже благополучия кошек: автоматизированный анализ позы животного", articleSlug: "automated-analysis-of-feline-posture-using-deep-learning-and-geometric-modeling" },
      { page: 32, rubric: "Календарь ветеринара", title: "Праздники животных в России и мире: октябрь–ноябрь 2026" },
    ],
  },
};

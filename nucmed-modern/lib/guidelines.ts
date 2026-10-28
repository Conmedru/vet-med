/**
 * «Гайдлайны и справочники» (ТЗ клиента, п. 4) — каталог ссылок на внешние документы.
 * Наполняется здесь, админки нет. rubrics — slug-и из lib/rubrics.ts.
 */

export interface GuidelineLink {
  label: string;
  url: string;
}

export interface Guideline {
  title: string;
  /** Original title, for foreign documents */
  titleOriginal?: string;
  description?: string;
  year?: number;
  /** Main link: Russian document when available, else the source page */
  url: string;
  language: "ru" | "en";
  /** Extra documents (Russian translations, toolkits, original page) */
  links?: GuidelineLink[];
  rubrics: string[];
}

export interface GuidelineGroup {
  id: string;
  title: string;
  description: string;
  url: string;
  items: Guideline[];
}

const WSAVA = "https://wsava.org/global-guidelines";
const WSAVA_FILES = "https://wsava.org/wp-content/uploads";
const AAHA = "https://www.aaha.org/resources";

export const GUIDELINE_GROUPS: GuidelineGroup[] = [
  {
    id: "wsava",
    title: "Всемирная ассоциация ветеринарии мелких домашних животных (WSAVA)",
    description: "Глобальные рекомендации WSAVA. Часть документов переведена на русский язык — ссылка ведёт на русскую версию.",
    url: `${WSAVA}/`,
    items: [
      {
        title: "Рекомендации по вакцинации собак и кошек",
        titleOriginal: "WSAVA Vaccination Guidelines",
        year: 2024,
        url: `${WSAVA_FILES}/2024/12/WSAVA-Vaccination-guidelines-2024_rus-compressed.pdf`,
        language: "ru",
        links: [
          { label: "Версия 2015 года (рус.)", url: `${WSAVA_FILES}/2020/01/WSAVA-vaccination-guidelines-2015-Russian.pdf` },
          { label: "Страница на сайте WSAVA", url: `${WSAVA}/vaccination-guidelines/` },
        ],
        rubrics: ["vaccination", "epidemiology", "dogs", "cats"],
      },
      {
        title: "Рекомендации по лечению боли",
        titleOriginal: "WSAVA Pain Management Guidelines",
        year: 2022,
        url: `${WSAVA_FILES}/2024/04/2022-WSAVA-Pain-Management-Guidelines_Russian_final-version.pdf`,
        language: "ru",
        links: [{ label: "Страница на сайте WSAVA", url: `${WSAVA}/pain-guidelines/` }],
        rubrics: ["anesthesiology", "therapy"],
      },
      {
        title: "Глобальные рекомендации по стоматологии",
        titleOriginal: "WSAVA Global Dental Guidelines",
        url: `${WSAVA_FILES}/2023/08/WSAVA-Global-Dental-Guidelines-JSAP-version_Rus.pdf`,
        language: "ru",
        links: [{ label: "Страница на сайте WSAVA", url: `${WSAVA}/dental-guidelines/` }],
        rubrics: ["dentistry"],
      },
      {
        title: "Рекомендации по оценке питания",
        titleOriginal: "WSAVA Global Nutrition Guidelines",
        url: `${WSAVA_FILES}/2020/01/Global-Nutritional-Assesment-Guidelines-Russian.pdf`,
        language: "ru",
        links: [
          { label: "Внедрение рекомендаций по питанию (рус.)", url: `${WSAVA_FILES}/2021/05/Implementing-the-WSAVA-Nutrition-Guidelines-Russian.pdf` },
          { label: "Анкета пищевого анамнеза (рус.)", url: `${WSAVA_FILES}/2021/05/Diet-History-Form-Russian.pdf` },
          { label: "Шкала мышечной массы собак (рус.)", url: `${WSAVA_FILES}/2021/05/Muscle-Condition-Score-Chart-for-Dogs-Russian.pdf` },
          { label: "Выбор корма для питомца (рус.)", url: `${WSAVA_FILES}/2021/05/Selecting-a-pet-food-for-your-pet-updated-2021_WSAVA-Global-Nutrition-Toolkit-Russian.pdf` },
          { label: "Страница на сайте WSAVA", url: `${WSAVA}/global-nutrition-guidelines/` },
        ],
        rubrics: ["nutrition", "therapy"],
      },
      {
        title: "Болезни печени",
        titleOriginal: "WSAVA Liver Disease Guidelines",
        url: `${WSAVA}/liver-disease-guidelines/`,
        language: "en",
        rubrics: ["gastroenterology", "histology"],
      },
      {
        title: "Гастроэнтерология: стандартизация диагностики",
        titleOriginal: "WSAVA Gastrointestinal Guidelines",
        url: `${WSAVA}/gastrointestinal-guidelines/`,
        language: "en",
        rubrics: ["gastroenterology", "histology"],
      },
      {
        title: "Стандартизация диагностики болезней почек",
        titleOriginal: "WSAVA Renal Standardization Guidelines",
        url: `${WSAVA}/renal-standardization-guidelines/`,
        language: "en",
        rubrics: ["nephrology-urology", "histology"],
      },
      {
        title: "Наследственные заболевания",
        titleOriginal: "WSAVA Hereditary Disease Guidelines",
        url: `${WSAVA}/hereditary-disease/`,
        language: "en",
        rubrics: ["genetics"],
      },
      {
        title: "Контроль репродукции",
        titleOriginal: "WSAVA Reproduction Control Guidelines",
        url: `${WSAVA}/reproduction-guidelines/`,
        language: "en",
        rubrics: ["endocrinology", "surgery"],
      },
      {
        title: "Благополучие животных",
        titleOriginal: "WSAVA Animal Welfare Guidelines",
        url: `${WSAVA}/animal-welfare-guidelines/`,
        language: "en",
        rubrics: ["therapy"],
      },
      {
        title: "Идентификация микрочипами",
        titleOriginal: "WSAVA Microchip Identification Guidelines",
        url: `${WSAVA}/microchip-identification-guidelines/`,
        language: "en",
        rubrics: ["therapy"],
      },
      {
        title: "Профессиональное благополучие ветеринарных специалистов",
        titleOriginal: "WSAVA Professional Wellness Guidelines",
        url: `${WSAVA}/professional-wellness-guidelines/`,
        language: "en",
        rubrics: [],
      },
    ],
  },
  {
    id: "aaha",
    title: "Американская ассоциация больниц для животных (AAHA)",
    description: "Клинические рекомендации AAHA для собак и кошек (на английском языке).",
    url: "https://www.aaha.org/for-veterinary-professionals/aaha-guidelines/",
    items: [
      { title: "Онкология у собак и кошек", titleOriginal: "AAHA Oncology Guidelines for Dogs and Cats", year: 2026, url: `${AAHA}/2026-aaha-oncology-guidelines-for-dogs-and-cats/`, language: "en", rubrics: ["oncology", "dogs", "cats"] },
      { title: "Направление пациентов к специалистам", titleOriginal: "AAHA Referral Guidelines", year: 2025, url: `${AAHA}/2025-aaha-referral-guidelines/`, language: "en", rubrics: ["therapy"] },
      { title: "One Health: взаимодействие с медицинскими специалистами", titleOriginal: "AAHA One Health Guidelines", year: 2025, url: `${AAHA}/2025-aaha-one-health-guidelines-navigating-cross-disciplinary-partnerships/`, language: "en", rubrics: ["epidemiology"] },
      { title: "Инфузионная терапия у собак и кошек", titleOriginal: "AAHA Fluid Therapy Guidelines for Dogs and Cats", year: 2024, url: `${AAHA}/2024-aaha-fluid-therapy-guidelines-for-dogs-and-cats/`, language: "en", rubrics: ["anesthesiology", "therapy", "dogs", "cats"] },
      { title: "Доступная ветеринарная помощь (Community Care)", titleOriginal: "AAHA Community Care Guidelines for Small Animal Practice", year: 2024, url: `${AAHA}/2024-aaha-community-care-guidelines-for-small-animal-practice/`, language: "en", rubrics: ["therapy"] },
      { title: "Ведение пожилых собак и кошек", titleOriginal: "AAHA Senior Care Guidelines for Dogs and Cats", year: 2023, url: `${AAHA}/2023-aaha-senior-care-guidelines-for-dogs-and-cats/`, language: "en", rubrics: ["therapy", "dogs", "cats"] },
      { title: "Вакцинация собак", titleOriginal: "AAHA Canine Vaccination Guidelines", year: 2022, url: `${AAHA}/2022-aaha-canine-vaccination-guidelines/`, language: "en", rubrics: ["vaccination", "dogs"] },
      { title: "Вакцинация кошек (AAHA/AAFP)", titleOriginal: "AAHA/AAFP Feline Vaccination Guidelines", year: 2020, url: `${AAHA}/2020-aahaaafp-feline-vaccination-guidelines/`, language: "en", rubrics: ["vaccination", "cats"] },
      { title: "Анестезия и мониторинг у собак и кошек", titleOriginal: "AAHA Anesthesia and Monitoring Guidelines for Dogs and Cats", year: 2020, url: `${AAHA}/2020-aaha-anesthesia-and-monitoring-guidelines-for-dogs-and-cats/`, language: "en", rubrics: ["anesthesiology", "dogs", "cats"] },
      { title: "Стоматология у собак и кошек", titleOriginal: "AAHA Dental Care Guidelines for Dogs and Cats", year: 2019, url: `${AAHA}/2019-aaha-dental-care-guidelines-for-dogs-and-cats/`, language: "en", rubrics: ["dentistry", "dogs", "cats"] },
    ],
  },
  {
    id: "references",
    title: "Справочники",
    description: "Официальные базы данных ветеринарных препаратов.",
    url: "https://www.fda.gov/animal-veterinary/products/approved-animal-drug-products-green-book",
    items: [
      {
        title: "«Зелёная книга» FDA — одобренные ветеринарные препараты",
        titleOriginal: "Approved Animal Drug Products (Green Book)",
        description: "Официальный список ветеринарных препаратов, одобренных FDA (США): действующие вещества, производители, показания и статус одобрения. Обновляется ежемесячно.",
        url: "https://www.fda.gov/animal-veterinary/products/approved-animal-drug-products-green-book",
        language: "en",
        rubrics: ["therapy"],
      },
    ],
  },
  {
    id: "russian",
    title: "Российские рекомендации и протоколы",
    description: "Протоколы, стандарты и клинические рекомендации российских профессиональных сообществ.",
    url: "",
    items: [
      {
        title: "VetProtocol — схемы лечения и протоколы",
        description: "Схемы лечения, протоколы по разным направлениям (ОРИТ, абсцессы, циститы, анестезия, вакцинация и др.). Бесплатный справочник: материалы собраны в одном месте и адаптированы для работы с любого устройства.",
        url: "https://vetprotocol.ru/protocol/",
        language: "ru",
        rubrics: ["therapy", "anesthesiology", "vaccination"],
      },
      {
        title: "Кардиологическое Ветеринарное Общество — согласованные рекомендации",
        description: "Протоколы эхокардиографии (для кошек и собак), рекомендации по диагностике и лечению кардиогенной артериальной тромбоэмболии у кошек. Ресурс профильной ассоциации для работы с кардиологическими пациентами.",
        url: "https://vet-cardio.ru/kvo/recomendation",
        language: "ru",
        rubrics: ["cardiology", "ultrasound", "dogs", "cats"],
      },
      {
        title: "Клинические рекомендации (rodog.ru)",
        description: "Клинические рекомендации — утверждённые, на рассмотрении, в архиве. Источник официальных документов по разным нозологиям.",
        url: "https://rodog.ru/clinical-recommendations",
        language: "ru",
        rubrics: ["therapy"],
      },
      {
        title: "Общие стандарты Национальной Ветеринарной Палаты",
        description: "Оказание помощи, неотложная помощь, анестезия, хирургия, контроль инфекций, лабораторные и инструментальные исследования, ведение документации. Организационные и процессуальные стандарты работы клиники.",
        url: "https://vetpalata.ru/standarty",
        language: "ru",
        rubrics: ["therapy", "surgery", "anesthesiology", "epidemiology", "lab-diagnostics"],
      },
      {
        title: "Рекомендации и протоколы ОЦ КВС (Eduvet)",
        description: "Рекомендации и протоколы из материалов курсов: например, рекомендации Ассоциации НефроУроВет по диагностике и терапии ХБП у кошек, рекомендации по структуре приёма и коммуникации с владельцем.",
        url: "https://www.eduvet.ru/study/materialy/rekomendatsii-i-protokoly/",
        language: "ru",
        rubrics: ["nephrology-urology", "therapy", "cats"],
      },
      {
        title: "Руководства и протоколы Анестезиологического ветеринарного общества «ВИТАР»",
        description: "Классификация степени анестезиологического риска (ASA – ВИТАР), липидный протокол по ASRA, протоколы периоперационного мониторинга, рекомендации по анестезии при сопутствующем диабете.",
        url: "https://www.biovitar.ru/rukovodstva-i-protokoly/",
        language: "ru",
        rubrics: ["anesthesiology", "endocrinology"],
      },
    ],
  },
];

export function getGuidelinesByRubric(slugs: string[]): (Guideline & { group: string })[] {
  return GUIDELINE_GROUPS.flatMap((g) =>
    g.items.filter((item) => item.rubrics.some((r) => slugs.includes(r))).map((item) => ({ ...item, group: g.id }))
  );
}

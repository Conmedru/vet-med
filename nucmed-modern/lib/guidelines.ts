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
const DOI = "https://doi.org";
const CEG_FILES = "https://cardiaceducationgroup.org/wp-content/uploads";

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
    id: "acvim",
    title: "Американский колледж ветеринарной внутренней медицины (ACVIM)",
    description:
      "Консенсусы ACVIM (ACVIM Endorsed Statements) и рекомендации рабочих групп, опубликованные в журнале ACVIM (JVIM), — в открытом доступе, на английском языке.",
    url: "https://www.acvim.org/journals-research/research/acvim-endorsed-statements",
    items: [
      // Кардиология
      { title: "Кардиомиопатии у кошек: классификация, диагностика и лечение", titleOriginal: "ACVIM consensus statement guidelines for the classification, diagnosis, and management of cardiomyopathies in cats", year: 2020, url: `${DOI}/10.1111/jvim.15745`, language: "en", rubrics: ["cardiology", "cats"] },
      { title: "Миксоматозная дегенерация митрального клапана у собак: диагностика и лечение", titleOriginal: "ACVIM consensus guidelines for the diagnosis and treatment of myxomatous mitral valve disease in dogs", year: 2019, url: `${DOI}/10.1111/jvim.15488`, language: "en", rubrics: ["cardiology", "dogs"] },
      { title: "Лёгочная гипертензия у собак: диагностика, классификация, лечение и мониторинг", titleOriginal: "ACVIM consensus statement guidelines for the diagnosis, classification, treatment, and monitoring of pulmonary hypertension in dogs", year: 2020, url: `${DOI}/10.1111/jvim.15725`, language: "en", rubrics: ["cardiology", "dogs"] },
      { title: "Системная артериальная гипертензия у собак и кошек", titleOriginal: "ACVIM consensus statement: Guidelines for the identification, evaluation, and management of systemic hypertension in dogs and cats", year: 2018, url: `${DOI}/10.1111/jvim.15331`, language: "en", rubrics: ["cardiology", "nephrology-urology", "dogs", "cats"] },
      // Неврология
      { title: "Эпилептический статус и кластерные приступы у собак и кошек", titleOriginal: "ACVIM Consensus Statement on the management of status epilepticus and cluster seizures in dogs and cats", year: 2024, url: `${DOI}/10.1111/jvim.16928`, language: "en", rubrics: ["neurology", "dogs", "cats"] },
      { title: "Острая экструзия межпозвонкового диска в грудопоясничном отделе у собак", titleOriginal: "ACVIM consensus statement on diagnosis and management of acute canine thoracolumbar intervertebral disc extrusion", year: 2022, url: `${DOI}/10.1111/jvim.16480`, language: "en", rubrics: ["neurology", "surgery", "dogs"] },
      { title: "Лечение судорог у собак", titleOriginal: "2015 ACVIM Small Animal Consensus Statement on Seizure Management in Dogs", year: 2016, url: `${DOI}/10.1111/jvim.13841`, language: "en", rubrics: ["neurology", "dogs"] },
      // Гастроэнтерология, гепатология, питание
      { title: "Хроническая воспалительная энтеропатия у собак: диагностика и лечение", titleOriginal: "ACVIM–endorsed statement: consensus statement and systematic review on guidelines for the diagnosis and treatment of chronic inflammatory enteropathy in dogs", year: 2026, url: `${DOI}/10.1093/jvimsj/aalaf017`, language: "en", rubrics: ["gastroenterology", "nutrition", "dogs"] },
      { title: "Лимфома низкой степени злокачественности и воспалительная энтеропатия у кошек: дифференциальная диагностика", titleOriginal: "ACVIM consensus statement guidelines on diagnosing and distinguishing low-grade neoplastic from inflammatory lymphocytic chronic enteropathies in cats", year: 2023, url: `${DOI}/10.1111/jvim.16690`, language: "en", rubrics: ["gastroenterology", "oncology", "histology", "cats"] },
      { title: "Панкреатит у кошек", titleOriginal: "ACVIM consensus statement on pancreatitis in cats", year: 2021, url: `${DOI}/10.1111/jvim.16053`, language: "en", rubrics: ["gastroenterology", "cats"] },
      { title: "Хронический гепатит у собак: диагностика и лечение", titleOriginal: "ACVIM consensus statement on the diagnosis and treatment of chronic hepatitis in dogs", year: 2019, url: `${DOI}/10.1111/jvim.15467`, language: "en", rubrics: ["gastroenterology", "dogs"] },
      { title: "Рациональное применение гастропротекторов у собак и кошек", titleOriginal: "ACVIM consensus statement: Support for rational administration of gastrointestinal protectants to dogs and cats", year: 2018, url: `${DOI}/10.1111/jvim.15337`, language: "en", rubrics: ["gastroenterology", "therapy", "dogs", "cats"] },
      // Нефрология и урология
      { title: "Недержание мочи у собак: диагностика и лечение", titleOriginal: "ACVIM consensus statement on diagnosis and management of urinary incontinence in dogs", year: 2024, url: `${DOI}/10.1111/jvim.16975`, language: "en", rubrics: ["nephrology-urology", "dogs"] },
      { title: "Лечение и профилактика уролитиаза у собак и кошек", titleOriginal: "ACVIM Small Animal Consensus Recommendations on the Treatment and Prevention of Uroliths in Dogs and Cats", year: 2016, url: `${DOI}/10.1111/jvim.14559`, language: "en", rubrics: ["nephrology-urology", "nutrition", "dogs", "cats"] },
      {
        title: "Гломерулярные болезни у собак: диагностика и лечение (серия консенсусов)",
        titleOriginal: "IRIS Canine Glomerular Disease Study Group consensus recommendations (JVIM, 2013)",
        year: 2013,
        url: `${DOI}/10.1111/jvim.12223`,
        language: "en",
        links: [
          { label: "Стандартная терапия", url: `${DOI}/10.1111/jvim.12230` },
          { label: "Иммуносупрессия при подтверждённой патологии", url: `${DOI}/10.1111/jvim.12228` },
          { label: "Иммуносупрессия без гистологического диагноза", url: `${DOI}/10.1111/jvim.12222` },
        ],
        rubrics: ["nephrology-urology", "dogs"],
      },
      { title: "Протеинурия у собак и кошек: оценка и ведение", titleOriginal: "Assessment and Management of Proteinuria in Dogs and Cats: 2004 ACVIM Forum Consensus Statement", year: 2005, url: `${DOI}/10.1111/j.1939-1676.2005.tb02713.x`, language: "en", rubrics: ["nephrology-urology", "dogs", "cats"] },
      // Гематология и иммунология
      { title: "Иммунная тромбоцитопения у собак и кошек: диагностика", titleOriginal: "ACVIM consensus statement on the diagnosis of immune thrombocytopenia in dogs and cats", year: 2024, url: `${DOI}/10.1111/jvim.16996`, language: "en", rubrics: ["therapy", "lab-diagnostics", "dogs", "cats"] },
      { title: "Иммунная тромбоцитопения у собак и кошек: лечение", titleOriginal: "ACVIM consensus statement on the treatment of immune thrombocytopenia in dogs and cats", year: 2024, url: `${DOI}/10.1111/jvim.17079`, language: "en", rubrics: ["therapy", "dogs", "cats"] },
      { title: "Иммуноопосредованная гемолитическая анемия у собак и кошек: диагностика", titleOriginal: "ACVIM consensus statement on the diagnosis of immune-mediated hemolytic anemia in dogs and cats", year: 2019, url: `${DOI}/10.1111/jvim.15441`, language: "en", rubrics: ["therapy", "lab-diagnostics", "dogs", "cats"] },
      { title: "Иммуноопосредованная гемолитическая анемия у собак: лечение", titleOriginal: "ACVIM consensus statement on the treatment of immune-mediated hemolytic anemia in dogs", year: 2019, url: `${DOI}/10.1111/jvim.15463`, language: "en", rubrics: ["therapy", "dogs"] },
      // Эндокринология
      { title: "Диагностика гиперадренокортицизма у собак", titleOriginal: "Diagnosis of Spontaneous Canine Hyperadrenocorticism: 2012 ACVIM Consensus Statement (Small Animal)", year: 2013, url: `${DOI}/10.1111/jvim.12192`, language: "en", rubrics: ["endocrinology", "dogs"] },
      // Инфекции
      { title: "Лептоспироз у собак (обновлённый консенсус)", titleOriginal: "Updated ACVIM consensus statement on leptospirosis in dogs", year: 2023, url: `${DOI}/10.1111/jvim.16903`, language: "en", rubrics: ["epidemiology", "vaccination", "dogs"] },
      { title: "Болезнь Лайма (боррелиоз) у собак и кошек", titleOriginal: "ACVIM consensus update on Lyme borreliosis in dogs and cats", year: 2018, url: `${DOI}/10.1111/jvim.15085`, language: "en", rubrics: ["epidemiology", "dogs", "cats"] },
      { title: "Антимикробная терапия у животных и антибиотикорезистентность", titleOriginal: "ACVIM Consensus Statement on Therapeutic Antimicrobial Use in Animals and Antimicrobial Resistance", year: 2015, url: `${DOI}/10.1111/jvim.12562`, language: "en", rubrics: ["therapy", "epidemiology"] },
      // Онкология
      { title: "Безопасная работа с цитостатиками в ветеринарной практике", titleOriginal: "ACVIM small animal consensus statement on safe use of cytotoxic chemotherapeutics in veterinary practice", year: 2018, url: `${DOI}/10.1111/jvim.15077`, language: "en", rubrics: ["oncology", "therapy"] },
      // Лошади и продуктивные животные
      { title: "Герпесвирус лошадей 1-го типа (обновлённый консенсус)", titleOriginal: "Updated ACVIM consensus statement on equine herpesvirus-1", year: 2024, url: `${DOI}/10.1111/jvim.17047`, language: "en", rubrics: ["farm-animals", "epidemiology"] },
      { title: "Вирусная диарея КРС: биология вируса, иммуносупрессия, вакцинация", titleOriginal: "Bovine viral diarrhea virus: An updated American College of Veterinary Internal Medicine consensus statement", year: 2020, url: `${DOI}/10.1111/jvim.15816`, language: "en", rubrics: ["farm-animals", "epidemiology", "vaccination"] },
      { title: "Лёгочное кровотечение, индуцированное нагрузкой, у лошадей", titleOriginal: "Exercise Induced Pulmonary Hemorrhage in Horses: American College of Veterinary Internal Medicine Consensus Statement", year: 2015, url: `${DOI}/10.1111/jvim.12593`, language: "en", rubrics: ["farm-animals"] },
    ],
  },
  {
    id: "cardiology-ceg",
    title: "Кардиология: Cardiac Education Group",
    description: "Рекомендации, практические памятки и формуляры Cardiac Education Group (CEG) — образовательной группы ветеринарных кардиологов, на английском языке.",
    url: "https://cardiaceducationgroup.org/resource-list/consensus-statements/",
    items: [
      { title: "Скрининг дилатационной кардиомиопатии у доберманов (ESVC)", titleOriginal: "ESVC screening guidelines for DCM in Doberman Pinschers", year: 2017, url: "https://www.sciencedirect.com/science/article/pii/S1760273417300619", language: "en", rubrics: ["cardiology", "dogs", "genetics"] },
      { title: "Доклиническая гипертрофическая кардиомиопатия у кошек", titleOriginal: "CEG Recommendations: Preclinical Feline HCM", year: 2024, url: `${CEG_FILES}/2024/09/CEG-Recommendations-Preclinical-Feline-HCM.pdf`, language: "en", rubrics: ["cardiology", "cats"] },
      { title: "Артериальная тромбоэмболия у кошек", titleOriginal: "CEG Recommendations: Feline ATE", year: 2024, url: `${CEG_FILES}/2024/09/CEG-Recommendations-Feline-ATE.pdf`, language: "en", rubrics: ["cardiology", "cats"] },
      { title: "Фибрилляция предсердий: диагностика и лечение", titleOriginal: "Atrial Fibrillation: Diagnosis and Clinical Management", url: `${CEG_FILES}/2026/04/CEG_PP_AtrialFibrillation-1.pdf`, language: "en", rubrics: ["cardiology", "dogs", "cats"] },
      { title: "Подход к кошке с одышкой", titleOriginal: "Approach to the dyspneic feline patient", url: `${CEG_FILES}/2016/02/CEG_PP_FelineDyspnea.pdf`, language: "en", rubrics: ["cardiology", "anesthesiology", "cats"] },
      {
        title: "Кардиологические формуляры: собаки и кошки",
        titleOriginal: "CEG Canine and Feline Drug Formulary",
        url: `${CEG_FILES}/2015/11/CEG_-Canine-Formulary-1.pdf`,
        language: "en",
        links: [{ label: "Формуляр для кошек", url: `${CEG_FILES}/2015/11/CEG_FelineFormulary.pdf` }],
        rubrics: ["cardiology", "therapy", "dogs", "cats"],
      },
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

/**
 * «Калькуляторы и шкалы» (ТЗ клиента, п. 9) — каталог ссылок на внешние калькуляторы.
 * Свои калькуляторы не делаем: только ссылки с обязательным указанием источника.
 */

export interface Calculator {
  title: string;
  description: string;
  url: string;
  rubrics: string[];
}

export interface CalculatorSource {
  id: string;
  name: string;
  url: string;
  description: string;
  items: Calculator[];
}

const VETPROTOCOL = "https://vetprotocol.ru";

export const CALCULATOR_SOURCES: CalculatorSource[] = [
  {
    id: "vetprotocol",
    name: "VetProtocol",
    url: `${VETPROTOCOL}/`,
    description: "Бесплатный справочник ветеринарных препаратов и протоколов, раздел ОРИТ.",
    items: [
      { title: "Калькулятор гемотрансфузии", description: "Расчёт объёма донорской крови.", url: `${VETPROTOCOL}/ICU/gemo_calculation.php`, rubrics: ["anesthesiology", "lab-diagnostics"] },
      { title: "Калькулятор площади поверхности тела", description: "Площадь тела по массе для расчёта доз.", url: `${VETPROTOCOL}/ICU/body_area.php`, rubrics: ["oncology", "therapy"] },
      { title: "Калькулятор ИПС дексмедетомидина (Дексдомитор)", description: "Постоянная инфузия с заданной скоростью.", url: `${VETPROTOCOL}/ICU/dexdomitor_calculation.php`, rubrics: ["anesthesiology"] },
      { title: "Калькулятор ИПС лидокаина", description: "Постоянная инфузия с заданной скоростью.", url: `${VETPROTOCOL}/ICU/lidocaine_calculation.php`, rubrics: ["anesthesiology"] },
      { title: "Конвертер доз глюкокортикостероидов", description: "Пересчёт эквивалентных доз ГКС.", url: `${VETPROTOCOL}/ICU/gks_converter.php`, rubrics: ["therapy", "endocrinology"] },
      { title: "Расчёт инфузий", description: "Объём и скорость инфузионной терапии.", url: `${VETPROTOCOL}/guide/infusion`, rubrics: ["anesthesiology", "therapy"] },
      { title: "Восполнение дефицита калия", description: "Расчёт добавления калия в инфузию.", url: `${VETPROTOCOL}/guide/deficit-caliya`, rubrics: ["anesthesiology", "therapy"] },
      { title: "Расчёт RER и кормление", description: "Энергетическая потребность покоя и питание по ЭФС.", url: `${VETPROTOCOL}/guide/ezfgs`, rubrics: ["nutrition", "anesthesiology"] },
      { title: "Материалы ОРИТ", description: "Таблицы быстрого расчёта ИПС и калия, сетка мониторинга, расчёт ПЭП, физиологические нормы.", url: `${VETPROTOCOL}/ICU/`, rubrics: ["anesthesiology"] },
      { title: "Справочник препаратов", description: "Дозировки и схемы применения ветеринарных препаратов.", url: `${VETPROTOCOL}/drug/`, rubrics: ["therapy"] },
    ],
  },
  {
    id: "vetnote",
    name: "Vetnote",
    url: "https://vetnote.ru/",
    description: "Ресурс для ветеринарных онкологов.",
    items: [
      {
        title: "Площадь поверхности тела",
        description: "Конвертер, формулы и таблицы для собак и кошек, расчёт для экзотических животных.",
        url: "https://vetnote.ru/body-surface-area",
        rubrics: ["oncology", "dogs", "cats", "exotics"],
      },
    ],
  },
  {
    id: "vetcount",
    name: "VetCount",
    url: "https://vetcount.ru/",
    description: "Ветеринарный справочник препаратов и калькуляторы.",
    items: [
      {
        title: "VetCount — справочник и калькуляторы",
        description: "Справочник препаратов, калькуляторы (инфузии, переливание крови, расчёт ИПС), литература, методические материалы, схемы лечения, материалы по дифференциальной диагностике.",
        url: "https://vetcount.ru/",
        rubrics: ["therapy", "anesthesiology"],
      },
    ],
  },
  {
    id: "aaha",
    name: "AAHA",
    url: "https://www.aaha.org/calculators-and-tools/",
    description: "Американская ассоциация больниц для животных (на английском языке).",
    items: [
      {
        title: "Калькулятор вакцинации кошек по образу жизни",
        description: "Индивидуальная схема вакцинации кошки по возрасту и факторам риска (по рекомендациям AAHA/AAFP 2020).",
        url: "https://www.aaha.org/resources/2020-aahaaafp-feline-vaccination-guidelines/feline-vaccine-calculator/",
        rubrics: ["vaccination", "cats"],
      },
      {
        title: "Калькуляторы и инструменты AAHA",
        description: "Схема вакцинации собак, калькулятор питания и плана снижения веса, шаблоны выписки и другие инструменты.",
        url: "https://www.aaha.org/calculators-and-tools/",
        rubrics: ["vaccination", "nutrition", "dogs", "cats"],
      },
    ],
  },
];

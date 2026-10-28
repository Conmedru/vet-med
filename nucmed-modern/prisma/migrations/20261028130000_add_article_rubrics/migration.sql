ALTER TABLE "articles" ADD COLUMN "rubrics" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "articles_rubrics_idx" ON "articles" USING GIN ("rubrics");

-- Initial rubrics from the old single category (refined later by scripts/reclassify-rubrics.ts)
UPDATE "articles" a SET "rubrics" = m.rubrics
FROM (VALUES
  ('Питомцы', ARRAY['cats', 'dogs', 'rodents', 'birds']::TEXT[]),
  ('Кошки', ARRAY['cats']::TEXT[]),
  ('Собаки', ARRAY['dogs']::TEXT[]),
  ('Грызуны', ARRAY['rodents']::TEXT[]),
  ('Птицы', ARRAY['birds']::TEXT[]),
  ('Птицы, попугаи', ARRAY['birds']::TEXT[]),
  ('Экзоты', ARRAY['exotics']::TEXT[]),
  ('Сельскохозяйственные животные', ARRAY['farm-animals']::TEXT[]),
  ('Нутрициология', ARRAY['nutrition']::TEXT[]),
  ('Хирургия', ARRAY['surgery']::TEXT[]),
  ('Терапия', ARRAY['therapy']::TEXT[]),
  ('Кардиология', ARRAY['cardiology']::TEXT[]),
  ('Онкология', ARRAY['oncology']::TEXT[]),
  ('Дерматология', ARRAY['dermatology']::TEXT[]),
  ('Офтальмология', ARRAY['ophthalmology']::TEXT[]),
  ('Ортопедия', ARRAY['orthopedics']::TEXT[]),
  ('Стоматология', ARRAY['dentistry']::TEXT[]),
  ('Неврология', ARRAY['neurology']::TEXT[]),
  ('Анестезиология', ARRAY['anesthesiology']::TEXT[]),
  ('Репродукция', ARRAY['endocrinology']::TEXT[]),
  ('Диетология', ARRAY['nutrition']::TEXT[]),
  ('Инфекционные болезни', ARRAY['epidemiology']::TEXT[]),
  ('Лабораторная диагностика', ARRAY['lab-diagnostics']::TEXT[]),
  ('Визуальная диагностика', ARRAY['radiology']::TEXT[]),
  ('Реабилитация', ARRAY['rehabilitation']::TEXT[]),
  ('Неотложная помощь', ARRAY['anesthesiology']::TEXT[]),
  ('Генетика', ARRAY['genetics']::TEXT[])
) AS m(category, rubrics)
WHERE a."category" = m.category;

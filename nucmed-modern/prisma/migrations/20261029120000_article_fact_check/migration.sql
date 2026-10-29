-- Result of the hallucination checks (rules + model fact-checker)
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "factCheck" JSONB;

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { buildArticleProcessingUserPrompt, PROCESSING_PROMPT_VERSION } from "../lib/ai/prompts";
import { callReplicateAI, REPLICATE_MODELS, type ReplicateModel } from "../lib/ai/replicate";
import { parsePartialJson } from "../lib/utils/json";

const prisma = new PrismaClient();
const OUTPUT_PATH = "/tmp/processed-article-example.md";

async function main() {
  const requestedId = process.argv[2];

  const article = requestedId
    ? await prisma.article.findUnique({
        where: { id: requestedId },
        include: { source: true },
      })
    : await prisma.article.findFirst({
        where: {
          status: { in: ["INGESTED", "DRAFT", "PUBLISHED"] },
          OR: [
            { titleOriginal: { contains: "study", mode: "insensitive" } },
            { titleOriginal: { contains: "clinical", mode: "insensitive" } },
            { titleOriginal: { contains: "diagnosis", mode: "insensitive" } },
            { titleOriginal: { contains: "therapy", mode: "insensitive" } },
            { contentOriginal: { contains: "clinical", mode: "insensitive" } },
            { contentOriginal: { contains: "study", mode: "insensitive" } },
          ],
        },
        include: { source: true },
        orderBy: [{ originalPublishedAt: "desc" }, { createdAt: "desc" }],
      });

  if (!article) {
    throw new Error("No suitable article found in database");
  }

  const config = await prisma.systemConfig.findUnique({ where: { key: "ai_model" } });
  const configuredModel = typeof config?.value === "string" ? config.value : null;
  const aiModel: ReplicateModel = configuredModel && configuredModel in REPLICATE_MODELS
    ? configuredModel as ReplicateModel
    : "claude-3.7-sonnet";

  const prompt = buildArticleProcessingUserPrompt({
    sourceName: article.source?.name || "Unknown",
    titleOriginal: article.titleOriginal,
    contentOriginal: article.contentOriginal?.slice(0, 12000),
    excerptOriginal: article.excerptOriginal,
  });

  const aiResponse = await callReplicateAI(prompt, aiModel);
  const result = parsePartialJson(aiResponse.output);

  if (!result.title || !result.content || !result.category) {
    throw new Error("AI response is missing required fields");
  }

  const output = [
    `# ${result.title}`,
    "",
    `- Источник: ${article.source?.name || "Unknown"}`,
    `- Исходный материал: ${article.titleOriginal}`,
    `- Модель: ${aiResponse.model}`,
    `- Версия промпта: ${PROCESSING_PROMPT_VERSION}`,
    `- Категория: ${result.category}`,
    result.excerpt ? `- Excerpt: ${result.excerpt}` : null,
    Array.isArray(result.tags) && result.tags.length > 0 ? `- Теги: ${result.tags.join(", ")}` : null,
    "",
    "---",
    "",
    result.content,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(OUTPUT_PATH, output, "utf8");

  console.log(`Saved demo article to ${OUTPUT_PATH}`);
  console.log(`Article ID: ${article.id}`);
  console.log(`Prompt version: ${PROCESSING_PROMPT_VERSION}`);
  console.log(`Source: ${article.source?.name || "Unknown"}`);
  console.log(`Title: ${article.titleOriginal}`);
  console.log(`Output size: ${Buffer.byteLength(output, "utf8")} bytes`);
  console.log(path.resolve(OUTPUT_PATH));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Consolidated article processing module
 * Single source of truth for AI processing prompt and logic.
 *
 * Hallucination guard (schemes of onco-compass and Neuro 2.0):
 *   0. no source text → rejected before any model call;
 *   1. generation is checked by rules (lib/ai/fidelity.ts: numbers, doses, inflation, speculation)
 *      and then by a model fact-checker (lib/ai/fact-check.ts);
 *   2. one regeneration with the list of problems;
 *   3. still failing → DRAFT with a "factcheck|" note: never auto-scheduled, an editor decides.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { callReplicateAI, DEFAULT_TEXT_MODEL, type ReplicateModel } from "@/lib/ai/replicate";
import { checkFidelity, formatFidelityIssues, stripToText, type FidelityResult } from "@/lib/ai/fidelity";
import { factCheckArticle, formatFactCheckIssues, type FactCheckResult } from "@/lib/ai/fact-check";
import { generateArticleCover } from "@/lib/ai/replicate";
import { uploadImage, isS3Configured } from "@/lib/storage/s3";
import { withRetry } from "@/lib/utils/retry";
import { parsePartialJson } from "@/lib/utils/json";
import { scheduleNewArticle } from "@/lib/articles/scheduler";
import { buildArticleProcessingUserPrompt, PROCESSING_PROMPT_VERSION } from "@/lib/ai/prompts";
import { rubricsFromAI, primaryRubricName } from "@/lib/rubrics";

export interface ProcessingResult {
  success: boolean;
  articleId: string;
  title?: string;
  error?: string;
  coverGenerated?: boolean;
  /** Failed the hallucination checks and was left in DRAFT for an editor */
  held?: boolean;
}

interface AIArticle {
  title?: string;
  content?: string;
  excerpt?: string;
  rubrics?: unknown;
  tags?: string[];
  significanceScore?: number;
}

/** Below this the source is a title or citation only: the model would invent the article */
const MIN_SOURCE_CHARS = 150;
/** First generation + one regeneration with the list of problems */
const MAX_GENERATIONS = 2;
/** Same limit as app/api/cron/process */
const MAX_PROCESS_RETRIES = 3;
const NO_SOURCE_MARKER = "no-source:";

/**
 * Marker in processingError of an article held by the checks. Admin and every
 * auto-publish path must leave such DRAFTs to an editor.
 */
export const FACTCHECK_HOLD_PREFIX = "factcheck|";

function holdReason(fidelity: FidelityResult | null, factCheck: FactCheckResult | null): string {
  const parts: string[] = [];
  if (fidelity && !fidelity.ok) parts.push(formatFidelityIssues(fidelity.issues));
  if (factCheck?.verdict === "major") parts.push(`фактчекер: ${formatFactCheckIssues(factCheck)}`);
  return `${FACTCHECK_HOLD_PREFIX}${parts.join("; ") || "проверка не пройдена"}`.slice(0, 1500);
}

function fidelityFeedback(f: FidelityResult): string {
  const lines: string[] = [];
  if (f.stats.unsupportedDoses.length) lines.push(`Дозы и концентрации, которых НЕТ в исходном тексте: ${f.stats.unsupportedDoses.join(", ")}. Убери их.`);
  if (f.stats.unsupportedNumbers.length) lines.push(`Числа, которых НЕТ в исходном тексте: ${f.stats.unsupportedNumbers.slice(0, 12).join(", ")}. Убери их или замени теми, что есть в источнике.`);
  for (const issue of f.issues) {
    if (issue.code === "inflated") lines.push(`Текст раздут относительно источника (${issue.detail}): сократи до 1–2 абзацев без разделов, только то, что сказано в источнике.`);
    if (issue.code === "speculation") lines.push(`Убери домыслы и оговорки (${issue.detail}).`);
    if (issue.code === "raw-json" || issue.code === "garbled") lines.push(`Сбой формата: ${issue.detail}.`);
  }
  return lines.join("\n");
}

async function logRejection(articleId: string, code: string, note: string) {
  await prisma.activityLog
    .create({
      data: { action: "article.rejected", entityType: "article", entityId: articleId, actorType: "system", success: false, errorMessage: note, metadata: { code } },
    })
    .catch(console.error);
}

/**
 * Process a single article: AI text processing + cover generation
 * Used by both cron auto-processor and manual API endpoint
 */
export async function processAndGenerateCover(
  articleId: string,
  options: { generateCover?: boolean } = { generateCover: true }
): Promise<ProcessingResult> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { source: true },
  });

  if (!article) {
    return { success: false, articleId, error: "Article not found" };
  }

  if (article.status !== "INGESTED" && article.status !== "FAILED") {
    return { success: false, articleId, error: `Invalid status: ${article.status}` };
  }

  // Retry counter set by cron/process ("retry:N|…"): kept on failure so retries stay bounded
  const retryPrefix = (article.processingError || "").match(/^retry:\d+\|/)?.[0] ?? "";

  // Step 0: no usable source text → never ask the model (it would invent the article from the title)
  const sourceParts = [article.contentOriginal, article.excerptOriginal ?? ""];
  const sourceText = stripToText(sourceParts.filter(Boolean).join("\n"));
  if (sourceText.length < MIN_SOURCE_CHARS) {
    const note = `${NO_SOURCE_MARKER} исходного текста ${sourceText.length} зн. — пересказывать нечего`;
    console.warn(`[Process] REJECT ${articleId}: ${note}`);
    await prisma.article.update({
      where: { id: articleId },
      // retry exhausted: re-running the model on an empty source only costs money
      data: { status: "FAILED", processingError: `retry:${MAX_PROCESS_RETRIES}|${note}` },
    });
    await logRejection(articleId, "no-source", note);
    return { success: false, articleId, error: note };
  }

  // Step 1: Mark as PROCESSING
  await prisma.article.update({
    where: { id: articleId },
    data: { status: "PROCESSING" },
  });

  const startTime = Date.now();

  try {
    // Get AI model from settings
    const [modelConfig, factCheckConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: "ai_model" } }),
      prisma.systemConfig.findUnique({ where: { key: "fact_check_enabled" } }),
    ]);
    const aiModel = ((modelConfig?.value as string) || DEFAULT_TEXT_MODEL) as ReplicateModel;
    const factCheckEnabled = factCheckConfig?.value !== false && factCheckConfig?.value !== "false";

    // Step 2: AI text processing via Replicate, checked against the source.
    // One regeneration with the list of problems; if it still fails, the article is held for an editor.
    const prompt = buildArticleProcessingUserPrompt({
      sourceName: article.source?.name || "Unknown",
      titleOriginal: article.titleOriginal,
      contentOriginal: article.contentOriginal.slice(0, 12000),
      excerptOriginal: article.excerptOriginal,
    });
    const fidelitySource = [article.titleOriginal, ...sourceParts];

    let costUsd = 0;
    let modelUsed: string = aiModel;
    let result: AIArticle | null = null;
    let fidelity: FidelityResult | null = null;
    let factCheck: FactCheckResult | null = null;
    let attempts = 0;
    let feedback = "";

    while (attempts < MAX_GENERATIONS) {
      attempts++;
      const aiResponse = await callReplicateAI(
        feedback
          ? `${prompt}\n\nПРЕДЫДУЩИЙ ВАРИАНТ НЕ ПРОШЁЛ ПРОВЕРКУ ПО ИСХОДНОМУ ТЕКСТУ:\n${feedback}\nПерепиши, используя только факты, числа и дозы из исходного текста. Ничего не добавляй от себя.`
          : prompt,
        aiModel
      );
      costUsd += aiResponse.costUsd ?? 0;
      modelUsed = aiResponse.model;
      const parsed = parsePartialJson(aiResponse.output) as AIArticle;
      if (!parsed.title || !parsed.content) {
        feedback = "Ответ не в формате JSON с полями title и content.";
        result = null;
        continue;
      }
      result = parsed;

      fidelity = checkFidelity({ source: fidelitySource, output: `${parsed.title}\n${parsed.excerpt ?? ""}\n${parsed.content}` });
      factCheck = null;
      if (!fidelity.ok) {
        feedback = fidelityFeedback(fidelity);
        console.warn(`[Process] Fidelity failed for ${articleId} (attempt ${attempts}): ${formatFidelityIssues(fidelity.issues)}`);
        continue;
      }

      if (factCheckEnabled) {
        factCheck = await factCheckArticle({
          titleOriginal: article.titleOriginal,
          source: sourceParts.join("\n"),
          title: parsed.title,
          excerpt: parsed.excerpt,
          content: parsed.content,
        });
        costUsd += factCheck.costUsd;
        if (factCheck.verdict === "major") {
          feedback = `Фактчекер нашёл расхождения с оригиналом: ${formatFactCheckIssues(factCheck)}`;
          console.warn(`[Process] FactCheck major for ${articleId} (attempt ${attempts}): ${formatFactCheckIssues(factCheck)}`);
          continue;
        }
      }
      break;
    }

    if (!result?.title || !result.content) {
      // The model never returned usable JSON — a generation fault, cron may retry
      throw new Error("Missing required fields in AI response");
    }
    const title = result.title;

    const passed = !!fidelity?.ok && (!factCheckEnabled || (!!factCheck && factCheck.verdict !== "major"));
    const holdNote = passed ? null : holdReason(fidelity, factCheck);

    const rubrics = rubricsFromAI(result.rubrics);
    const category = primaryRubricName(rubrics) || "Общая ветеринария";
    const processingTime = Date.now() - startTime;
    const factCheckRecord = {
      passed,
      attempts,
      checkedAt: new Date().toISOString(),
      rules: fidelity ? { ok: fidelity.ok, issues: fidelity.issues, stats: fidelity.stats } : null,
      model: factCheck ? { verdict: factCheck.verdict, issues: factCheck.issues, model: factCheck.model } : factCheckEnabled ? null : "disabled",
    };

    // Step 3: Save AI results. Failed checks → DRAFT with a hold note: only an editor can publish it.
    await prisma.article.update({
      where: { id: articleId },
      data: {
        title: result.title,
        content: result.content,
        excerpt: result.excerpt,
        category,
        rubrics,
        tags: result.tags || [],
        significanceScore: result.significanceScore,
        status: passed ? "PROCESSING" : "DRAFT", // PROCESSING until cover is done and scheduled
        aiModel: modelUsed,
        aiPromptVersion: PROCESSING_PROMPT_VERSION,
        processingCostUsd: costUsd,
        processingError: holdNote,
        factCheck: factCheckRecord as Prisma.InputJsonValue,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: passed ? "article.processed" : "article.held",
        entityType: "article",
        entityId: articleId,
        actorType: "system",
        success: passed,
        errorMessage: holdNote,
        metadata: {
          model: modelUsed,
          processingTimeMs: processingTime,
          costUsd,
          category,
          rubrics,
          attempts,
          factCheckVerdict: factCheck?.verdict ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    if (!passed) {
      console.warn(`[Process] HOLD ${articleId} in DRAFT for an editor: ${holdNote}`);
      return { success: true, articleId, title: result.title, coverGenerated: false, held: true };
    }

    console.log(`[Process] AI done: "${result.title}" | ${rubrics.join(", ")} | ${attempts} attempt(s) | ${processingTime}ms`);

    // Step 4: Generate cover (optional)
    let coverGenerated = false;
    if (options.generateCover) {
      try {
        coverGenerated = await generateAndSaveCover(
          articleId,
          title,
          result.excerpt || "",
          category
        );
      } catch (coverError) {
        console.error(`[Process] Cover failed for ${articleId}:`, coverError);
        // Cover failure is non-fatal — article status handling will proceed
      }
    }

    // Step 5: Schedule the article
    const scheduled = await scheduleNewArticle(articleId);

    if (!scheduled) {
      // Fallback happened, it's a DRAFT now.
      console.log(`[Process] Warning: Could not schedule ${articleId}, fell back to DRAFT.`);
    }

    return {
      success: true,
      articleId,
      title: result.title,
      coverGenerated,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Process] Failed ${articleId}:`, errorMsg);

    await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "FAILED",
        processingError: `${retryPrefix}${errorMsg}`,
      },
    }).catch(console.error);

    return { success: false, articleId, error: errorMsg };
  }
}

/**
 * Generate AI cover and save to S3/DB
 */
async function generateAndSaveCover(
  articleId: string,
  title: string,
  excerpt: string,
  category: string
): Promise<boolean> {
  console.log(`[Cover] Generating for ${articleId}...`);

  const result = await generateArticleCover(title, excerpt, category);

  // Download image from Replicate
  const downloadImage = async () => {
    const imageResponse = await fetch(result.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Download failed: ${imageResponse.status}`);
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  };

  const buffer = await withRetry(downloadImage, {
    maxAttempts: 3,
    initialDelayMs: 2000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
    retryableErrors: ["429", "404", "rate limit"],
    onRetry: (attempt, error, delay) => {
      console.warn(`[Cover] Retry download (${attempt}) after ${delay}ms: ${error.message}`);
    },
  });

  let permanentUrl: string;
  if (isS3Configured()) {
    const date = new Date();
    const key = `articles/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${articleId}/cover-ai.webp`;
    permanentUrl = await uploadImage(buffer, key, "image/webp");
  } else {
    const base64 = buffer.toString("base64");
    permanentUrl = `data:image/webp;base64,${base64}`;
  }

  // Remove old cover
  await prisma.image.deleteMany({
    where: { articleId, isCover: true },
  });

  // Save new cover
  await prisma.image.create({
    data: {
      articleId,
      originalUrl: result.imageUrl,
      storedUrl: permanentUrl,
      isCover: true,
      caption: "AI-generated cover",
    },
  });

  await prisma.article.update({
    where: { id: articleId },
    data: { coverImageUrl: permanentUrl },
  });

  await prisma.activityLog.create({
    data: {
      action: "article.cover_generated",
      entityType: "article",
      entityId: articleId,
      actorType: "system",
      metadata: {
        prompt: result.prompt,
        costUsd: result.costUsd,
      },
    },
  });

  console.log(`[Cover] Done for ${articleId}`);
  return true;
}


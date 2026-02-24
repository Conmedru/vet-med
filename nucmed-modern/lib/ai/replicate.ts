/**
 * Replicate API Integration
 * https://replicate.com/docs/reference/http
 * 
 * Используем для AI обработки статей (перевод, саммаризация)
 */

import Replicate from "replicate";
import { withRetry } from "@/lib/utils/retry";
import { PROCESSING_SYSTEM_PROMPT } from "@/lib/ai/prompts";

// Модели для обработки текста (можно переключать)
export const REPLICATE_MODELS = {
  // Claude 3.7 Sonnet - новейшая модель (рекомендуется)
  "claude-3.7-sonnet": "anthropic/claude-3.7-sonnet",
  // Claude 3.5 Sonnet - проверенное качество
  "claude-3-sonnet": "anthropic/claude-3.5-sonnet",
  // Claude 3 Haiku - быстрый, дешевый
  "claude-3-haiku": "anthropic/claude-3-haiku",
  // Claude 3 Opus - максимум качества
  "claude-3-opus": "anthropic/claude-3-opus",
  // Meta Llama 3 70B - доступная альтернатива
  "llama-3-70b": "meta/meta-llama-3-70b-instruct",
  // Embeddings - all-mpnet-base-v2 (768 dimensions)
  "all-mpnet-base-v2": "replicate/all-mpnet-base-v2",
  // Image generation - p-image (sub 1 second)
  "p-image": "prunaai/p-image",
} as const;

export type ReplicateModel = keyof typeof REPLICATE_MODELS;

export interface ReplicateResponse {
  output: string;
  model: string;
  predictionId: string;
  costUsd: number;
  status: "succeeded" | "failed" | "canceled";
}

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string[] | string | null;
  error: string | null;
  metrics?: {
    predict_time?: number;
  };
}

/**
 * Вызов Replicate API для обработки текста
 * С автоматическим retry при сбоях
 */
export async function callReplicateAI(
  prompt: string,
  model: ReplicateModel = "llama-3-70b"
): Promise<ReplicateResponse> {
  return withRetry(
    () => _callReplicateAI(prompt, model),
    {
      maxAttempts: 3,
      initialDelayMs: 2000,
      onRetry: (attempt, error, delay) => {
        console.warn(`[Replicate] Retry ${attempt}, next in ${delay}ms: ${error.message}`);
      },
    }
  );
}

const SYSTEM_PROMPT = PROCESSING_SYSTEM_PROMPT;

/**
 * Внутренняя функция вызова API через Replicate SDK
 */
async function _callReplicateAI(
  prompt: string,
  model: ReplicateModel
): Promise<ReplicateResponse> {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  const replicate = new Replicate({ auth: apiToken });
  const modelId = REPLICATE_MODELS[model];

  console.log(`[Replicate] Running model: ${modelId}`);
  const startTime = Date.now();

  // Формируем input для Llama/Mixtral
  const input = {
    prompt: prompt,
    system_prompt: SYSTEM_PROMPT,
    max_new_tokens: 4096,
    temperature: 0.3,
    top_p: 0.9,
  };

  // Вызываем модель через SDK
  const output = await replicate.run(modelId as `${string}/${string}`, { input });

  const elapsed = Date.now() - startTime;
  console.log(`[Replicate] Completed in ${elapsed}ms`);

  // Собираем output (может быть массивом строк или строкой)
  let outputText: string;
  if (Array.isArray(output)) {
    outputText = output.join("");
  } else if (typeof output === "string") {
    outputText = output;
  } else {
    outputText = JSON.stringify(output);
  }

  // Расчёт стоимости (приблизительно)
  const costMap: Record<string, number> = {
    "anthropic/claude-3.7-sonnet": 0.018,
    "anthropic/claude-3.5-sonnet": 0.015,
    "anthropic/claude-3-haiku": 0.001,
    "anthropic/claude-3-opus": 0.075,
    "meta/meta-llama-3-70b-instruct": 0.02,
  };
  const costUsd = costMap[modelId] || 0.02;

  return {
    output: outputText,
    model: modelId,
    predictionId: `local-${Date.now()}`,
    costUsd,
    status: "succeeded",
  };
}

/**
 * Проверка доступности API
 */
export async function checkReplicateConnection(): Promise<boolean> {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    return false;
  }

  try {
    const response = await fetch("https://api.replicate.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================
// IMAGE GENERATION (p-image)
// ============================================

export interface ImageGenerationResponse {
  imageUrl: string;
  model: string;
  predictionId: string;
  costUsd: number;
  status: "succeeded" | "failed" | "canceled";
}

// Системный промпт для генерации промпта обложки
const COVER_PROMPT_SYSTEM = `You are an expert prompt engineer specializing in photorealistic animal photography and veterinary imagery.

TASK: Create a prompt for a PHOTOREALISTIC image based on the veterinary article topic.
GOAL: Stunning, professional photograph-quality image WITHOUT text, people, or artifacts.

CORE RULE — ANIMALS FIRST:
- If the article mentions ANY animal species → the image MUST feature that real animal as the main subject, photographed in a realistic, natural or clinical setting.
- If no specific animal is mentioned → choose the most contextually fitting animal (e.g. nutrition → dog or cat eating; cardiology → a golden retriever with stethoscope nearby; parasitology → a close-up of a tick on animal fur).
- Only if the topic is genuinely abstract (e.g. molecular biology, pure chemistry) → use a close-up macro of biological tissue or a subtle animal-themed scientific still life.

STRICTLY FORBIDDEN:
- Human faces, doctors, patients, people in any form
- Text, letters, words, watermarks, logos, infographics
- Cartoon, anime, illustration, painting, drawing styles
- Abstract or surreal art when a realistic photo is possible

PHOTOGRAPHY STYLE:
- Photorealistic, National Geographic quality, Canon EOS R5 or similar DSLR/mirrorless
- Natural or soft studio lighting, shallow depth of field (bokeh background)
- Sharp focus on the animal subject, cinematic color grading
- Settings: clinic, nature habitat, farm, wildlife reserve, or clean white/dark studio

ANIMAL SELECTION BY TOPIC:
- Dogs/cats/small pets → show the specific breed if mentioned, otherwise golden retriever or tabby cat
- Horses/equine → muscular horse in field or stable, dramatic natural light
- Farm/livestock → cow, sheep, or pig in farm setting, golden hour light
- Exotic/reptile → lizard, snake, or parrot with vivid colors, macro detail
- Birds/avian → parrot, raptor, or songbird in sharp focus
- Wildlife/zoo → wolf, lion, bear, or other fitting wild animal
- Rodents/small mammals → rabbit, hamster, or rat in clinical or natural setting
- Fish/aquatic → fish in clear water, macro scale detail

RULES:
- Length: 30-50 words
- English language only
- Start with the animal and setting: "A photorealistic close-up of a [animal]...", "A golden retriever lying on a veterinary examination table...", "A majestic horse grazing..."
- Always end with: "photorealistic, National Geographic style, 8k, cinematic lighting, shallow depth of field"

OUTPUT FORMAT:
Return ONLY a valid JSON object:
{
  "prompt": "A photorealistic..."
}`;

/**
 * Генерация промпта для обложки статьи через LLM
 */
export async function generateCoverPrompt(
  title: string,
  excerpt: string,
  category: string
): Promise<string> {
  const userPrompt = `Article Title: "${title}"
Category: ${category}
Excerpt: ${excerpt}

Create a prompt for an abstract visualization of this article.`;

  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  const replicate = new Replicate({ auth: apiToken });

  const modelId = "anthropic/claude-3.7-sonnet";

  const output = await replicate.run(modelId as `${string}/${string}`, {
    input: {
      prompt: userPrompt,
      system_prompt: COVER_PROMPT_SYSTEM,
      max_tokens: 1024,
      temperature: 0.7,
      max_image_resolution: 0.001,
    },
  }) as string[] | string;

  let outputText: string;
  if (Array.isArray(output)) {
    outputText = output.join("").trim();
  } else if (typeof output === "string") {
    outputText = output.trim();
  } else {
    outputText = String(output).trim();
  }

  console.log("[CoverPrompt] Raw LLM output:", outputText);

  let promptText = "";
  try {
    // Try to parse JSON
    // If output contains markdown code blocks, strip them
    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0]);
      promptText = json.prompt;
    } else {
      // Fallback if no JSON found (unlikely with json_mode, but possible)
      promptText = outputText;
    }
  } catch (e) {
    console.error("[CoverPrompt] Failed to parse JSON:", e);
    // Fallback: simple cleanup
    promptText = outputText.replace(/^["']|["']$/g, "").trim();
  }

  // Final cleanup of forbidden words just in case
  promptText = promptText.replace(/\b(cover|article|book|magazine|text|title)\b/gi, "visualization");

  // Ensure it's not too long
  if (promptText.length > 500) {
    promptText = promptText.slice(0, 500);
  }

  console.log("[CoverPrompt] Final prompt:", promptText);
  return promptText;
}

/**
 * Генерация изображения обложки через p-image
 * Using predictions API for better control over image output
 */
export async function generateCoverImage(
  prompt: string,
  options: {
    width?: number;
    height?: number;
    negativePrompt?: string;
  } = {}
): Promise<ImageGenerationResponse> {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  const {
    width = 1200,
    height = 630, // OG image ratio
    negativePrompt = "text, letters, words, typography, chinese characters, kanji, watermark, logo, signature, human face, realistic person, distorted, blurry, low quality, ugly, book cover, magazine cover, poster, infographic",
  } = options;

  console.log(`[p-image] Generating cover: ${prompt.slice(0, 100)}...`);
  const startTime = Date.now();

  // First, get the latest version of the model
  const modelResponse = await fetch("https://api.replicate.com/v1/models/prunaai/p-image", {
    headers: {
      "Authorization": `Bearer ${apiToken}`,
    },
  });

  if (!modelResponse.ok) {
    throw new Error(`Failed to get model info: ${await modelResponse.text()}`);
  }

  const modelInfo = await modelResponse.json();
  const latestVersion = modelInfo.latest_version?.id;

  if (!latestVersion) {
    throw new Error("Could not find latest version of p-image model");
  }

  console.log(`[p-image] Using version: ${latestVersion.slice(0, 20)}...`);

  // Create prediction with version
  const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: latestVersion,
      input: {
        prompt: prompt,
        negative_prompt: negativePrompt,
        width: width,
        height: height,
        num_inference_steps: 4,
        guidance_scale: 1,
      },
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create prediction: ${errorText}`);
  }

  const prediction = await createResponse.json();
  console.log(`[p-image] Prediction created: ${prediction.id}`);

  // Poll for completion
  let result = prediction;
  while (result.status === "starting" || result.status === "processing") {
    await new Promise(resolve => setTimeout(resolve, 500));

    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check prediction status`);
    }

    result = await statusResponse.json();
  }

  const elapsed = Date.now() - startTime;
  console.log(`[p-image] Completed in ${elapsed}ms, status: ${result.status}`);

  if (result.status === "failed") {
    throw new Error(`Image generation failed: ${result.error || "Unknown error"}`);
  }

  // Extract URL from output
  let imageUrl: string;
  const output = result.output;

  if (typeof output === "string") {
    imageUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    imageUrl = String(output[0]);
  } else {
    console.error("[p-image] Unexpected output:", output);
    throw new Error("Unexpected output format from p-image");
  }

  console.log(`[p-image] Image URL: ${imageUrl.slice(0, 80)}...`);

  return {
    imageUrl,
    model: "prunaai/p-image",
    predictionId: prediction.id,
    costUsd: 0.003,
    status: "succeeded",
  };
}

/**
 * Полный пайплайн: генерация промпта + изображения
 */
export async function generateArticleCover(
  title: string,
  excerpt: string,
  category: string
): Promise<{ imageUrl: string; prompt: string; costUsd: number }> {
  const prompt = await withRetry(
    () => generateCoverPrompt(title, excerpt, category),
    {
      maxAttempts: 4,
      initialDelayMs: 5000,
      backoffMultiplier: 2,
      maxDelayMs: 15000,
      retryableErrors: ["429", "rate limit", "too many requests", "throttled"],
      onRetry: (attempt, error: Error, delay) => {
        console.warn(`[GenerateCover] Retry prompt (${attempt}) after ${delay}ms: ${error instanceof Error ? error.message : error}`);
      },
    }
  );

  const result = await withRetry(
    () => generateCoverImage(prompt),
    {
      maxAttempts: 4,
      initialDelayMs: 5000,
      backoffMultiplier: 2,
      maxDelayMs: 15000,
      retryableErrors: ["429", "rate limit", "too many requests", "throttled"],
      onRetry: (attempt, error: Error, delay) => {
        console.warn(`[GenerateCover] Retry image (${attempt}) after ${delay}ms: ${error instanceof Error ? error.message : error}`);
      },
    }
  );

  return {
    imageUrl: result.imageUrl,
    prompt: prompt,
    costUsd: result.costUsd + 0.02, // LLM + image cost
  };
}

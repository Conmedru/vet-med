import Replicate from "replicate";
import { PROCESSING_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface ArticleProcessingInput {
  titleOriginal: string;
  contentOriginal: string;
  excerptOriginal?: string | null;
  sourceName: string;
}

export interface ArticleProcessingOutput {
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  significanceScore: number;
}

const SYSTEM_PROMPT = PROCESSING_SYSTEM_PROMPT;

export async function processArticle(
  input: ArticleProcessingInput
): Promise<ArticleProcessingOutput> {
  const userMessage = `Обработай следующую статью:

ИСТОЧНИК: ${input.sourceName}

ЗАГОЛОВОК:
${input.titleOriginal}

СОДЕРЖАНИЕ:
${input.contentOriginal || input.excerptOriginal || "Содержание недоступно"}`;

  console.log(`[AI] Processing article: ${input.titleOriginal.substring(0, 50)}...`);

  try {
    const output = await replicate.run("openai/gpt-4o-mini", {
      input: {
        prompt: userMessage,
        system_prompt: SYSTEM_PROMPT,
        max_tokens: 4096,
        temperature: 0.3,
      },
    });

    // Replicate returns array of strings for text models
    const responseText = Array.isArray(output) ? output.join("") : String(output);

    console.log(`[AI] Raw response length: ${responseText.length}`);

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as ArticleProcessingOutput;

    // Validate required fields
    if (!parsed.title || !parsed.content || !parsed.category) {
      throw new Error("Missing required fields in AI response");
    }

    // Ensure tags is an array
    if (!Array.isArray(parsed.tags)) {
      parsed.tags = [];
    }

    // Ensure significanceScore is a number between 1-10
    if (typeof parsed.significanceScore !== "number" || parsed.significanceScore < 1 || parsed.significanceScore > 10) {
      parsed.significanceScore = 5;
    }

    console.log(`[AI] Processed: "${parsed.title}" | ${parsed.category} | Score: ${parsed.significanceScore}`);

    return parsed;
  } catch (error) {
    console.error("[AI] Processing error:", error);
    throw error;
  }
}

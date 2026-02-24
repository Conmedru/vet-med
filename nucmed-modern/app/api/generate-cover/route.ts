import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth, validateAuthWithDevBypass } from "@/lib/auth";
import { generateArticleCover } from "@/lib/ai/replicate";

/**
 * POST /api/generate-cover
 * Генерация обложки для статьи через AI (без привязки к конкретной статье)
 * Используется при создании новой статьи
 * Требует авторизации
 */
export async function POST(request: NextRequest) {
  // Авторизация
  const auth = validateAuthWithDevBypass(request, validateAdminAuth);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, excerpt, category } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required to generate cover" },
        { status: 400 }
      );
    }

    console.log(`[GenerateCover] Starting standalone generation for: ${title.substring(0, 50)}...`);

    // Генерируем обложку
    const result = await generateArticleCover(
      title, 
      excerpt || "", 
      category || "Визуализация"
    );
    
    console.log(`[GenerateCover] Replicate URL: ${result.imageUrl}`);

    // Для новых статей возвращаем URL от Replicate напрямую
    // При сохранении статьи, URL будет сохранён в базу
    // Примечание: Replicate URLs временные (expire через ~1 час)
    // При сохранении статьи можно конвертировать в base64 или S3

    // Скачиваем и конвертируем в base64 для надёжности
    const imageResponse = await fetch(result.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from Replicate: ${imageResponse.statusText}`);
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:image/webp;base64,${base64}`;
    
    console.log(`[GenerateCover] Converted to Base64 (${(base64.length / 1024).toFixed(2)} KB)`);

    return NextResponse.json({
      success: true,
      coverImageUrl: dataUrl,
      replicateUrl: result.imageUrl,
      prompt: result.prompt,
      costUsd: result.costUsd,
    });
  } catch (error) {
    console.error("[GenerateCover] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      { error: "Failed to generate cover", details: message },
      { status: 500 }
    );
  }
}

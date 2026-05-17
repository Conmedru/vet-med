import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRouteAuth } from "@/lib/auth/guards";

/**
 * POST /api/admin/articles/reset-failed
 * Сбрасывает все FAILED статьи обратно в INGESTED для повторной обработки
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdminRouteAuth(request);
  if (authError) return authError;

  const result = await prisma.article.updateMany({
    where: { status: "FAILED" },
    data: { status: "INGESTED", processingError: null },
  });

  return NextResponse.json({ reset: result.count });
}

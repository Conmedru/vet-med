import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadImage, isS3Configured } from '@/lib/storage/s3';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET  /api/migrate-images — check status (how many base64 vs S3)
 * POST /api/migrate-images — migrate all base64 covers to S3
 */

async function getStatus() {
  const base64Count = await prisma.article.count({
    where: { coverImageUrl: { startsWith: 'data:' } },
  });
  const s3Count = await prisma.article.count({
    where: { coverImageUrl: { startsWith: 'http' } },
  });
  const nullCount = await prisma.article.count({
    where: { coverImageUrl: null },
  });
  return { base64Count, s3Count, nullCount, s3Configured: isS3Configured() };
}

export async function GET() {
  const status = await getStatus();
  return NextResponse.json({ timestamp: new Date().toISOString(), ...status });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json({
      error: 'S3 not configured. Set S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET env vars.',
    }, { status: 400 });
  }

  const articles = await prisma.article.findMany({
    where: { coverImageUrl: { startsWith: 'data:' } },
    select: { id: true, coverImageUrl: true },
  });

  const results: Array<{ id: string; status: string; url?: string; error?: string }> = [];

  for (const article of articles) {
    try {
      const dataUrl = article.coverImageUrl!;
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        results.push({ id: article.id, status: 'skip', error: 'Invalid data URL format' });
        continue;
      }

      const contentType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
      const date = new Date();
      const key = `articles/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${article.id}/cover.${ext}`;

      const s3Url = await uploadImage(buffer, key, contentType);

      await prisma.article.update({
        where: { id: article.id },
        data: { coverImageUrl: s3Url },
      });

      // Also update the images table if there's a cover entry
      await prisma.image.updateMany({
        where: { articleId: article.id, isCover: true },
        data: { storedUrl: s3Url },
      });

      results.push({ id: article.id, status: 'migrated', url: s3Url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ id: article.id, status: 'error', error: msg });
    }
  }

  const migrated = results.filter(r => r.status === 'migrated').length;
  const errors = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    total: articles.length,
    migrated,
    errors,
    skipped,
    results,
  });
}

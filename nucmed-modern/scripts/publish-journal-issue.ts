import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { uploadImage } from '@/lib/storage/s3';
import { journalAssetKey } from '@/lib/magazine/issues';

/**
 * Выкладывает номер журнала «Ветеринарный консилиум» из PDF: сам PDF, обложку (стр. 1)
 * и страницы для онлайн-чтения (webp, с миниатюрами) — в S3, затем создаёт или обновляет JournalIssue.
 * Оглавление номера — в lib/magazine/issues.ts. Нужен pdftoppm (poppler).
 *
 * Запуск:
 *   npx tsx scripts/publish-journal-issue.ts <file.pdf> --slug 2026-1 --number "1/2026" --date 2026-10-23 [--publish]
 */

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const pdfPath = args[0];
const slug = arg('--slug');
const issueNumber = arg('--number');
const date = arg('--date');
const publish = args.includes('--publish');

// Served as is, without the Next.js optimizer (it timed out fetching 34 pages at once)
const PAGE_WIDTH = 1600;
const THUMB_WIDTH = 160;

async function main() {
  if (!pdfPath || !slug || !issueNumber || !date) {
    throw new Error('Usage: publish-journal-issue.ts <file.pdf> --slug 2026-1 --number "1/2026" --date 2026-10-23 [--publish]');
  }
  const pdf = readFileSync(pdfPath);
  const dir = mkdtempSync(join(tmpdir(), 'journal-'));
  try {
    // 200 dpi of A4 is ~1650 px wide: enough for the 1600 px pages and the cover
    execFileSync('pdftoppm', ['-r', '200', '-png', pdfPath, join(dir, 'p')]);
    const pages = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
    console.log(`Pages: ${pages.length}`);

    const pdfUrl = await uploadImage(pdf, journalAssetKey(slug, 'issue.pdf'), 'application/pdf');
    const cover = await sharp(join(dir, pages[0])).resize({ width: 1200 }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    const coverImageUrl = await uploadImage(cover, journalAssetKey(slug, 'cover.jpg'), 'image/jpeg');

    for (const [i, file] of pages.entries()) {
      const n = String(i + 1).padStart(2, '0');
      const page = await sharp(join(dir, file)).resize({ width: PAGE_WIDTH }).webp({ quality: 82 }).toBuffer();
      await uploadImage(page, journalAssetKey(slug, `pages/${n}.webp`), 'image/webp');
      const thumb = await sharp(join(dir, file)).resize({ width: THUMB_WIDTH }).webp({ quality: 75 }).toBuffer();
      await uploadImage(thumb, journalAssetKey(slug, `pages/thumb-${n}.webp`), 'image/webp');
      process.stdout.write('.');
    }
    console.log();

    const data = {
      title: `Ветеринарный консилиум № ${issueNumber}`,
      issueNumber,
      publicationDate: new Date(`${date}T00:00:00Z`),
      coverImageUrl,
      coverAlt: `Обложка журнала «Ветеринарный консилиум» № ${issueNumber}`,
      pdfUrl,
      landingUrl: null,
      ...(publish ? { isPublished: true, isFeatured: true } : {}),
    };
    const issue = await prisma.journalIssue.upsert({ where: { slug }, create: { slug, ...data }, update: data });
    console.log(`Issue ${issue.slug} (${issue.id}) saved, published: ${issue.isPublished}`);
    console.log(`PDF ${(pdf.length / 1024 / 1024).toFixed(1)} MB, ${pages.length} pages`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

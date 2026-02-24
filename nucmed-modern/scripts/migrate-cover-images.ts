#!/usr/bin/env tsx
/**
 * Migration Script: Download Replicate Cover Images to S3
 * 
 * This script finds all articles with Replicate URLs in coverImageUrl
 * and migrates them to permanent S3 storage.
 * 
 * Usage:
 *   npm run migrate:covers
 *   or
 *   tsx scripts/migrate-cover-images.ts
 */

import { PrismaClient } from '@prisma/client';
import { uploadImage, isS3Configured } from '../lib/storage/s3';

const prisma = new PrismaClient();

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ articleId: string; error: string }>;
}

async function migrateArticleCover(articleId: string, replicateUrl: string): Promise<boolean> {
  try {
    console.log(`\n[Migrate] Article ${articleId}`);
    console.log(`  Replicate URL: ${replicateUrl.slice(0, 80)}...`);

    // Download image from Replicate
    const response = await fetch(replicateUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`  Downloaded: ${(buffer.length / 1024).toFixed(2)} KB`);

    let permanentUrl: string;

    if (isS3Configured()) {
      // Upload to S3
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `articles/${year}/${month}/${articleId}/cover-migrated.webp`;

      permanentUrl = await uploadImage(buffer, key, 'image/webp');
      console.log(`  Uploaded to S3: ${permanentUrl}`);
    } else {
      // Save as Base64
      const base64 = buffer.toString('base64');
      permanentUrl = `data:image/webp;base64,${base64}`;
      console.log(`  Converted to Base64 (${(base64.length / 1024).toFixed(2)} KB)`);
    }

    // Update database
    await prisma.$transaction(async (tx) => {
      // Update or create Image record
      await tx.image.deleteMany({
        where: {
          articleId,
          isCover: true,
        },
      });

      await tx.image.create({
        data: {
          articleId,
          originalUrl: replicateUrl,
          storedUrl: permanentUrl,
          isCover: true,
          caption: 'Migrated cover image',
        },
      });

      // Update Article
      await tx.article.update({
        where: { id: articleId },
        data: { coverImageUrl: permanentUrl },
      });
    });

    console.log(`  ✓ Migration successful`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`  ✗ Migration failed: ${message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Cover Image Migration Script');
  console.log('='.repeat(60));

  // Check S3 configuration
  const s3Configured = isS3Configured();
  console.log(`\nDebug: isS3Configured() = ${s3Configured}`);
  
  if (!s3Configured) {
    console.warn('\n⚠️  S3 is not configured!');
    console.warn('Images will be saved as Base64 Data URLs directly in the database.');
    console.warn('This is acceptable for development/demo but NOT recommended for production.');
    console.warn('Database size will increase significantly.\n');
  } else {
    console.log('\n✓ S3 is configured');
  }

  // Find articles with Replicate URLs
  console.log('\nSearching for articles with Replicate URLs...');
  
  const articles = await prisma.article.findMany({
    where: {
      coverImageUrl: {
        contains: 'replicate.delivery',
      },
    },
    select: {
      id: true,
      coverImageUrl: true,
      title: true,
      titleOriginal: true,
    },
  });

  console.log(`\nFound ${articles.length} articles with Replicate URLs`);

  if (articles.length === 0) {
    console.log('\n✓ No migration needed. All covers are already in permanent storage.');
    await prisma.$disconnect();
    return;
  }

  // Confirm migration
  console.log('\nArticles to migrate:');
  articles.forEach((article, i) => {
    const title = article.title || article.titleOriginal;
    console.log(`  ${i + 1}. ${title.slice(0, 60)}...`);
  });

  console.log('\n⚠️  This will download and re-upload all cover images.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Migrate each article
  const stats: MigrationStats = {
    total: articles.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const article of articles) {
    if (!article.coverImageUrl) {
      stats.skipped++;
      continue;
    }

    const success = await migrateArticleCover(article.id, article.coverImageUrl);
    
    if (success) {
      stats.migrated++;
    } else {
      stats.failed++;
      stats.errors.push({
        articleId: article.id,
        error: 'Migration failed',
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total articles:     ${stats.total}`);
  console.log(`✓ Migrated:         ${stats.migrated}`);
  console.log(`⊘ Skipped:          ${stats.skipped}`);
  console.log(`✗ Failed:           ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\nFailed articles:');
    stats.errors.forEach(({ articleId, error }) => {
      console.log(`  - ${articleId}: ${error}`);
    });
  }

  console.log('\n✓ Migration complete!\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});

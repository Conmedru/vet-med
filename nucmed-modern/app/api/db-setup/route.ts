import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const execAsync = promisify(exec);

const ALL_TABLES = [
  'articles', 'sources', 'images', 'users', 'sessions', 'api_keys',
  'article_embeddings', 'image_embeddings', 'search_queries',
  'article_views', 'article_edits', 'activity_logs',
  'system_config', 'scheduled_jobs', 'subscribers',
  'sponsored_posts', 'newsletter_campaigns', 'journal_issues', 'events',
];

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  const cronSecret = process.env.CRON_SECRET;
  const adminApiKey = process.env.ADMIN_API_KEY;

  return authHeader === `Bearer ${cronSecret}` || apiKey === adminApiKey || apiKey === cronSecret;
}

async function runSetup(applyMigrations: boolean) {
  const steps: string[] = [];
  const errors: string[] = [];

  // Step 1: DB connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    steps.push('DB connected OK');
  } catch (e: unknown) {
    return { steps, errors: [`DB connection failed: ${e instanceof Error ? e.message : String(e)}`], tables: {} };
  }

  let pushResult = { success: false, output: applyMigrations ? '' : 'Skipped: verification mode' };
  if (applyMigrations) {
    try {
      const { stdout } = await execAsync(
        'npx prisma migrate deploy 2>&1',
        { timeout: 45000, env: { ...process.env } }
      );
      pushResult = { success: true, output: stdout.slice(-1500) };
      steps.push('prisma migrate deploy OK');
    } catch (e: unknown) {
      const err = e as { stdout?: string; message?: string };
      pushResult = { success: false, output: (err.stdout || err.message || String(e)).slice(-1500) };
      errors.push('prisma migrate deploy FAILED');
    }
  } else {
    steps.push('prisma migrate deploy skipped (verification mode)');
  }

  // Step 3: Verify all tables
  const tables: Record<string, string> = {};
  for (const t of ALL_TABLES) {
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "${t}" LIMIT 0`);
      tables[t] = 'OK';
    } catch {
      tables[t] = 'MISSING';
    }
  }

  return { timestamp: new Date().toISOString(), steps, errors, pushResult, tables };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runSetup(false);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runSetup(true);
  return NextResponse.json(result);
}

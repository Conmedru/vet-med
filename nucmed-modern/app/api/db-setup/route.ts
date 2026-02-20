import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const execAsync = promisify(exec);

export async function POST(request: Request) {
  // Simple auth check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    steps: [] as string[],
  };

  // Step 1: Check basic DB connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    (results.steps as string[]).push('DB connected OK');
  } catch (e: unknown) {
    results.error = `DB connection failed: ${e instanceof Error ? e.message : String(e)}`;
    return NextResponse.json(results, { status: 500 });
  }

  // Step 2: Check if pg_trgm extension is available
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    (results.steps as string[]).push('pg_trgm extension OK');
  } catch (e: unknown) {
    (results.steps as string[]).push(`pg_trgm FAILED: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
  }

  // Step 3: Check if vector extension is available
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "vector"`);
    (results.steps as string[]).push('vector extension OK');
  } catch (e: unknown) {
    (results.steps as string[]).push(`vector FAILED: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
  }

  // Step 4: Try prisma db push
  try {
    const { stdout, stderr } = await execAsync(
      'npx prisma db push --skip-generate --accept-data-loss 2>&1',
      { timeout: 30000, env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' } }
    );
    results.prismaDbPush = {
      success: true,
      stdout: stdout.slice(-2000),
      stderr: stderr.slice(-2000),
    };
    (results.steps as string[]).push('prisma db push OK');
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    results.prismaDbPush = {
      success: false,
      stdout: err.stdout?.slice(-2000) || '',
      stderr: err.stderr?.slice(-2000) || '',
      error: err.message?.slice(0, 500) || String(e),
    };
    (results.steps as string[]).push('prisma db push FAILED');
  }

  // Step 5: Verify tables after push
  const tables = ['articles', 'sources', 'images', 'users', 'sponsored_posts', 'journal_issues'];
  const tableStatus: Record<string, string> = {};
  for (const table of tables) {
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 0`);
      tableStatus[table] = 'exists';
    } catch {
      tableStatus[table] = 'MISSING';
    }
  }
  results.tables = tableStatus;

  return NextResponse.json(results);
}

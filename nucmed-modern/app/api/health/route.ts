import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      DIRECT_URL: process.env.DIRECT_URL ? 'SET' : 'MISSING',
      CRON_SECRET: process.env.CRON_SECRET ? 'SET' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'not set',
    },
    database: 'checking...',
    data: {} as Record<string, unknown>,
    tables: {} as Record<string, string>,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
    checks.status = 'ok';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    checks.database = `error: ${msg.slice(0, 200)}`;
    checks.status = 'degraded';
    return NextResponse.json(checks, { status: 503 });
  }

  // Article counts by status
  try {
    const statusCounts = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT status, COUNT(*) as count FROM articles GROUP BY status
    `;
    (checks.data as Record<string, unknown>).articles = Object.fromEntries(
      statusCounts.map(r => [r.status, Number(r.count)])
    );
  } catch (e: unknown) {
    (checks.data as Record<string, unknown>).articles = `error: ${e instanceof Error ? e.message.slice(0, 150) : String(e)}`;
  }

  // Source count
  try {
    const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM sources`;
    (checks.data as Record<string, unknown>).sources = Number(count);
  } catch (e: unknown) {
    (checks.data as Record<string, unknown>).sources = `error: ${e instanceof Error ? e.message.slice(0, 150) : String(e)}`;
  }

  // Check if sponsored_posts table exists
  try {
    await prisma.$queryRaw`SELECT 1 FROM sponsored_posts LIMIT 0`;
    (checks.tables as Record<string, string>).sponsored_posts = 'exists';
  } catch {
    (checks.tables as Record<string, string>).sponsored_posts = 'MISSING';
  }

  // Check if journal_issues table exists
  try {
    await prisma.$queryRaw`SELECT 1 FROM journal_issues LIMIT 0`;
    (checks.tables as Record<string, string>).journal_issues = 'exists';
  } catch {
    (checks.tables as Record<string, string>).journal_issues = 'MISSING';
  }

  return NextResponse.json(checks, {
    status: checks.status === 'ok' ? 200 : 503,
  });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
    checks.status = 'ok';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    checks.database = `error: ${msg.slice(0, 200)}`;
    checks.status = 'degraded';
  }

  return NextResponse.json(checks, {
    status: checks.status === 'ok' ? 200 : 503,
  });
}

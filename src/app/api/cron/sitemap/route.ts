import {runSitemapMaintenance} from '@/lib/sitemapManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ok: false, error: 'Unauthorized'}, {status: 401});
  }

  const url = new URL(request.url);
  const submit = url.searchParams.get('submit') === '1' || String(process.env.GOOGLE_SEARCH_CONSOLE_ENABLED || '').toLowerCase() === 'true';
  const dryRun = url.searchParams.get('dryRun') === '1';
  const force = url.searchParams.get('force') === '1';
  const log = await runSitemapMaintenance({
    trigger: force ? 'manual_force' : 'cron',
    dryRun,
    submit
  });

  return Response.json({ok: log.errorCount === 0, ...log}, {status: log.errorCount === 0 ? 200 : 500});
}

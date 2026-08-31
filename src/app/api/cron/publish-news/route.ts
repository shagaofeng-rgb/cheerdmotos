import {
  cleanupNewsAutomationTests,
  publishDailyAutomatedNews,
  runNewsDeliveryTest
} from '@/lib/newsPublisher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {'Cache-Control': 'no-store, no-cache, must-revalidate'}});
}

export async function GET(request: Request) {
  if (!authorized(request)) return json({ok: false, error: 'Unauthorized'}, 401);

  const url = new URL(request.url);
  if (url.searchParams.get('cleanupTest') === '1') {
    const cleanup = await cleanupNewsAutomationTests();
    return json({ok: true, cleanup});
  }
  if (url.searchParams.get('deliveryTest') === '1') {
    const result = await runNewsDeliveryTest(url.origin);
    return json(result, result.ok ? 200 : 500);
  }

  const targetValue = Number(url.searchParams.get('target') || 1);
  const result = await publishDailyAutomatedNews({
    target: Number.isFinite(targetValue) ? targetValue : 1,
    dryRun: url.searchParams.get('dryRun') === '1',
    deliveryBaseUrl: url.origin,
    trigger: (request.headers.get('user-agent') || '').includes('vercel-cron') ? 'cron' : 'manual'
  });
  return json(result, result.ok ? 200 : 503);
}

import {syncGoogleSeoSnapshot} from '@/lib/googleSeo';

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
  const snapshot = await syncGoogleSeoSnapshot();
  const acceptable = snapshot.status === 'ok' || snapshot.status === 'not_configured';
  return Response.json({
    ok: snapshot.status === 'ok',
    status: snapshot.status,
    syncedAt: snapshot.syncedAt,
    siteUrl: snapshot.siteUrl,
    range: snapshot.range,
    totals: snapshot.totals,
    sitemaps: snapshot.sitemaps,
    error: snapshot.error
  }, {status: acceptable ? 200 : 500});
}

import {syncGoogleSeoSnapshot} from '@/lib/googleSeo';
import {runSitemapMaintenance} from '@/lib/sitemapManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ok: false, error: 'Unauthorized'}, {status: 401});
  }
  // This is the only scheduled Google submission path. Daily sitemap maintenance
  // remains local so sitemap freshness does not consume Search Console quota.
  const sitemap = await runSitemapMaintenance({trigger: 'google_seo_cron', submit: true});
  const snapshot = await syncGoogleSeoSnapshot();
  const acceptable = snapshot.status === 'ok' || snapshot.status === 'not_configured';
  return Response.json({
    ok: acceptable && sitemap.errorCount === 0,
    status: snapshot.status,
    syncedAt: snapshot.syncedAt,
    siteUrl: snapshot.siteUrl,
    range: snapshot.range,
    totals: snapshot.totals,
    sitemaps: snapshot.sitemaps,
    sitemapSubmission: {
      submitted: sitemap.googleSubmitted,
      result: sitemap.googleResult,
      errors: sitemap.errors
    },
    error: snapshot.error
  }, {status: acceptable && sitemap.errorCount === 0 ? 200 : 500});
}

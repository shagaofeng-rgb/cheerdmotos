import {GOOGLE_SITEMAP_PATHS, runGoogleSeoMaintenance} from '@/lib/googleSeo';
import {runSitemapMaintenance} from '@/lib/sitemapManager';
import {siteUrl} from '@/lib/site';

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
  const sitemap = await runSitemapMaintenance({trigger: 'google_seo_cron'});
  const {run, snapshot} = await runGoogleSeoMaintenance({
    trigger: 'google_seo_cron',
    sitemapUrls: GOOGLE_SITEMAP_PATHS.map((path) => `${siteUrl}${path}`)
  });
  const acceptable = snapshot.status === 'ok' && !run.error;
  return Response.json({
    ok: acceptable && sitemap.errorCount === 0,
    status: snapshot.status,
    syncedAt: snapshot.syncedAt,
    siteUrl: snapshot.siteUrl,
    range: snapshot.range,
    totals: snapshot.totals,
    sitemaps: snapshot.sitemaps,
    sitemapMaintenance: {urlCount: sitemap.urlCount, errors: sitemap.errors},
    submission: run,
    error: run.error || snapshot.error
  }, {status: acceptable && sitemap.errorCount === 0 ? 200 : 500});
}

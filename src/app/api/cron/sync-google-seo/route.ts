import {GOOGLE_SITEMAP_PATHS, runGoogleSeoMaintenance} from '@/lib/googleSeo';
import {runSitemapMaintenance} from '@/lib/sitemapManager';
import {siteUrl} from '@/lib/site';
import {persistentWritesAvailable} from '@/lib/durableStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

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
  if (!persistentWritesAvailable()) return Response.json({ok: false, error: 'Persistent storage is unavailable'}, {status: 503});
  const sitemap = await runSitemapMaintenance({trigger: 'google_seo_cron'});
  if (sitemap.errorCount) return Response.json({ok: false, sitemapErrors: sitemap.errors}, {status: 500});
  const {run, snapshot} = await runGoogleSeoMaintenance({
    trigger: 'google_seo_cron',
    sitemapUrls: GOOGLE_SITEMAP_PATHS.map((path) => `${siteUrl}${path}`),
    force: new URL(request.url).searchParams.get('force') === '1'
  });
  const acceptable = snapshot.status === 'ok' && !run.error;
  console.info('[google-seo-cron]', JSON.stringify({
    submission: run.submitted ? 'accepted' : run.due ? 'failed' : 'already_submitted_this_week',
    results: run.results.map(({sitemapUrl, submitted}) => ({sitemapUrl, submitted})),
    sitemaps: snapshot.sitemaps.map(({path, lastDownloaded, errors}) => ({path, lastDownloaded, errors})),
    inspections: snapshot.inspections?.map(({url, verdict, coverage, error}) => ({url, verdict, coverage, ...(error ? {error} : {})})),
    status: snapshot.status,
    ...(run.error ? {error: run.error} : {})
  }));
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

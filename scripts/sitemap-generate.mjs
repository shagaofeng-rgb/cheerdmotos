const args = new Set(process.argv.slice(2));
const baseUrl = (process.env.SITEMAP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
const endpoint = new URL('/api/cron/sitemap', baseUrl);

if (args.has('--dry-run')) endpoint.searchParams.set('dryRun', '1');
if (args.has('--submit')) endpoint.searchParams.set('submit', '1');
if (args.has('--force')) endpoint.searchParams.set('force', '1');

const headers = {};
if (process.env.CRON_SECRET) {
  headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
}

const response = await fetch(endpoint, {headers});
const payload = await response.json().catch(() => ({}));

if (args.has('--verbose') || !response.ok) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(`sitemap ${response.ok ? 'ok' : 'failed'}: ${payload.urlCount || 0} urls, google=${payload.googleResult || 'not_requested'}`);
}

if (!response.ok) process.exitCode = 1;

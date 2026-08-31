const baseUrl = (process.env.SITE_AUDIT_BASE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
const expectedCanonicalOrigin = 'https://www.cheerdmotos.com';
const concurrency = Math.max(1, Math.min(10, Number(process.env.SITE_AUDIT_CONCURRENCY || 6)));
const issues = [];
const warnings = [];

function decodeHtml(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
}

function locations(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decodeHtml(match[1].trim()));
}

function originMapped(url) {
  const parsed = new URL(url, baseUrl);
  return new URL(`${parsed.pathname}${parsed.search}`, baseUrl).toString();
}

async function fetchChecked(url, options = {}) {
  const startedAt = Date.now();
  const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(20_000), ...options});
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > 2_500) warnings.push(`${url}: slow response ${elapsedMs}ms`);
  return response;
}

async function mapLimit(items, worker) {
  let next = 0;
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index);
    }
  }));
}

const sitemapIndexResponse = await fetchChecked(`${baseUrl}/sitemap.xml`);
if (sitemapIndexResponse.status !== 200) throw new Error(`sitemap.xml returned ${sitemapIndexResponse.status}`);
const sitemapIndex = await sitemapIndexResponse.text();
const sitemapUrls = locations(sitemapIndex);
const pageUrls = new Set();

await mapLimit(sitemapUrls, async (sitemapUrl) => {
  const response = await fetchChecked(originMapped(sitemapUrl));
  const xml = await response.text();
  if (response.status !== 200 || !/<urlset\b/i.test(xml)) {
    issues.push(`${sitemapUrl}: invalid sitemap response ${response.status}`);
    return;
  }
  locations(xml).forEach((url) => pageUrls.add(url));
});

const internalPaths = new Set();
const imagePaths = new Set();

await mapLimit([...pageUrls], async (canonicalUrl) => {
  const response = await fetchChecked(originMapped(canonicalUrl));
  const html = await response.text();
  const path = new URL(canonicalUrl).pathname;
  if (response.status !== 200) issues.push(`${path}: HTTP ${response.status}`);
  if (!/<title>[^<]+<\/title>/i.test(html)) issues.push(`${path}: missing title`);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) issues.push(`${path}: expected 1 h1, found ${h1Count}`);
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1]
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
    || '';
  if (!canonical.startsWith(expectedCanonicalOrigin)) issues.push(`${path}: invalid canonical ${canonical || 'missing'}`);

  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(image[0])) issues.push(`${path}: image missing alt`);
    const src = image[0].match(/\bsrc=["']([^"']+)/i)?.[1];
    if (src) imagePaths.add(new URL(decodeHtml(src), baseUrl).pathname + new URL(decodeHtml(src), baseUrl).search);
  }
  for (const link of html.matchAll(/\bhref=["']([^"']+)/gi)) {
    try {
      const parsed = new URL(decodeHtml(link[1]), baseUrl);
      if (parsed.origin === new URL(baseUrl).origin && !parsed.pathname.startsWith('/api/')) internalPaths.add(parsed.pathname);
    } catch {}
  }
});

await mapLimit([...imagePaths], async (path) => {
  const response = await fetchChecked(new URL(path, baseUrl), {method: 'GET'});
  if (!response.ok) issues.push(`${path}: image HTTP ${response.status}`);
});

await mapLimit([...internalPaths], async (path) => {
  const response = await fetchChecked(new URL(path, baseUrl), {method: 'HEAD'});
  if (response.status >= 400) issues.push(`${path}: internal link HTTP ${response.status}`);
});

const rootResponse = await fetchChecked(`${baseUrl}/`, {method: 'HEAD'});
for (const header of ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy']) {
  if (!rootResponse.headers.get(header)) issues.push(`/: missing security header ${header}`);
}

const explicitChecks = [
  ['/en/products', [301, 308], '/products'],
  ['/api/admin/orders', [401]],
  ['/api/account/me', [401]],
  ['/api/cron/publish-news', [401]]
];
for (const [path, statuses, expectedLocation] of explicitChecks) {
  const response = await fetchChecked(`${baseUrl}${path}`);
  if (!statuses.includes(response.status)) issues.push(`${path}: expected ${statuses.join('/')}, received ${response.status}`);
  if (expectedLocation && response.headers.get('location') !== expectedLocation) {
    issues.push(`${path}: expected location ${expectedLocation}, received ${response.headers.get('location') || 'missing'}`);
  }
}

if (warnings.length) {
  console.warn(`Site audit warnings (${warnings.length}):`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (issues.length) {
  console.error(`Site runtime audit failed with ${issues.length} issue(s):`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exitCode = 1;
} else {
  console.log(`Site runtime audit ok: ${pageUrls.size} pages, ${internalPaths.size} internal paths, ${imagePaths.size} rendered images, ${sitemapUrls.length} sitemap files.`);
}

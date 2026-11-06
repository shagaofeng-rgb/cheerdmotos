import assert from 'node:assert/strict';

const baseUrl = (process.env.SITEMAP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
const sitemapPaths = [
  '/sitemap-products.xml',
  '/sitemap-posts.xml',
  '/sitemap-categories.xml',
  '/sitemap-pages.xml',
  '/news-sitemap.xml',
  '/image-sitemap.xml'
];

function assertTrue(condition, message) {
  assert.equal(Boolean(condition), true, message);
}

function normalLocs(xml) {
  return [...xml.matchAll(/(?<!image:)<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function imageLocs(xml) {
  return [...xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) => match[1]);
}

async function fetchText(url) {
  const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(20_000)});
  const text = await response.text();
  assert.equal(response.status, 200, `${url} returned ${response.status}`);
  return text;
}

async function mapWithConcurrency(items, task, limit = 10) {
  let cursor = 0;
  const output = [];
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await task(items[index]);
    }
  }));
  return output;
}

const index = await fetchText(`${baseUrl}/sitemap.xml`);
const indexLocs = normalLocs(index);
assert.deepEqual(
  indexLocs.map((url) => new URL(url).pathname),
  sitemapPaths,
  'sitemap index must expose exactly the six public child sitemaps'
);

const sitemapXml = Object.fromEntries(await Promise.all(sitemapPaths.map(async (path) => [
  path,
  await fetchText(`${baseUrl}${path}`)
])));

const contentSitemaps = sitemapPaths.filter((path) => path !== '/image-sitemap.xml');
const contentPageUrls = new Set(contentSitemaps.flatMap((path) => normalLocs(sitemapXml[path])));
assertTrue(contentPageUrls.has(`${baseUrl}/products`), 'The public product catalogue must be discoverable in the sitemap.');
const imagePageUrls = normalLocs(sitemapXml['/image-sitemap.xml']);
const imageUrls = [...new Set(imageLocs(sitemapXml['/image-sitemap.xml']))];

for (const url of [...contentPageUrls, ...imagePageUrls]) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, baseUrl, `non-canonical sitemap page origin: ${url}`);
  assert.equal(parsed.protocol, 'https:', `non-HTTPS sitemap page: ${url}`);
  assert.equal(parsed.search, '', `parameterized sitemap page: ${url}`);
  assert.equal(parsed.hash, '', `fragment sitemap page: ${url}`);
}

for (const url of imagePageUrls) {
  assertTrue(contentPageUrls.has(url), `image sitemap page is missing from its public page sitemap: ${url}`);
}

const pageChecks = await mapWithConcurrency([...new Set([...contentPageUrls, ...imagePageUrls])], async (url) => {
  const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(20_000)});
  const html = await response.text();
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)/i)?.[1]
    || html.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical/i)?.[1]
    || '';
  return {url, status: response.status, canonical: new URL(canonical || '/', baseUrl).href, hasCanonical: Boolean(canonical)};
});

for (const result of pageChecks) {
  assert.equal(result.status, 200, `${result.url} returned ${result.status}`);
  assertTrue(result.hasCanonical, `${result.url} is missing a canonical URL`);
  assert.equal(result.canonical, result.url, `${result.url} canonical points to ${result.canonical}`);
}

const imageChecks = await mapWithConcurrency(imageUrls, async (url) => {
  const response = await fetch(url, {method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(20_000)});
  return {url, status: response.status, contentType: response.headers.get('content-type') || ''};
});

for (const result of imageChecks) {
  assertTrue(result.status >= 200 && result.status < 300, `${result.url} returned ${result.status}`);
  assertTrue(result.contentType.startsWith('image/'), `${result.url} has non-image content type ${result.contentType}`);
}

console.log(`sitemap regression ok: ${pageChecks.length} page URLs and ${imageChecks.length} unique image URLs checked`);

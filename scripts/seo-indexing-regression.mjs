import assert from 'node:assert/strict';

const baseUrl = (process.env.SEO_INDEXING_BASE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
const legacyPaths = [
  '/blog/auto-blog-20260710-1-electric-dirt-bike-checklist'
];
const historicalRedirects = [
  ['/news/fat-tire-ebike-city-trail-selection', '/blog/fat-tire-ebike-city-trail-selection'],
  ['/news/smart-mobility-support-planning-20260708-3', '/news/smart-mobility-support-planning']
];

async function text(path) {
  const response = await fetch(`${baseUrl}${path}`, {redirect: 'manual', signal: AbortSignal.timeout(20000)});
  const body = await response.text();
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return body;
}

const index = await text('/sitemap.xml');
assert.match(index, /news-sitemap\.xml/, 'root sitemap does not include the News sitemap');
assert.match(index, /image-sitemap\.xml/, 'root sitemap does not include the image sitemap');

const posts = await text('/sitemap-posts.xml');
for (const path of legacyPaths) {
  assert(!posts.includes(path), `${path} must not be included in the public posts sitemap`);
  const page = await text(path);
  assert.match(page, /<meta name="robots" content="noindex, follow"/, `${path} is missing its noindex directive`);
  assert.match(page, /<link rel="canonical" href="https:\/\/www\.cheerdmotos\.com\//, `${path} is missing a canonical URL`);
}

for (const [source, destination] of historicalRedirects) {
  const response = await fetch(`${baseUrl}${source}`, {redirect: 'manual', signal: AbortSignal.timeout(20000)});
  assert.equal(response.status, 308, `${source} must use a permanent redirect`);
  assert.equal(response.headers.get('location'), destination, `${source} must redirect directly to ${destination}`);
  assert(!posts.includes(source), `${source} must not be included in the public posts sitemap`);

  const page = await text(destination);
  assert(page.includes(`<link rel="canonical" href="${baseUrl}${destination}"`), `${destination} is missing its canonical URL`);
}

console.log(`SEO indexing regression ok: ${legacyPaths.length} noindex legacy pages and ${historicalRedirects.length} historical redirects checked.`);

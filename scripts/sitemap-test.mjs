const baseUrl = (process.env.SITEMAP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
const urls = [
  '/robots.txt',
  '/sitemap.xml',
  '/sitemap-products.xml',
  '/sitemap-posts.xml',
  '/sitemap-categories.xml',
  '/sitemap-pages.xml',
  '/news-sitemap.xml',
  '/image-sitemap.xml'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const path of urls) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  assert(response.status === 200, `${path} returned ${response.status}`);
  if (path.endsWith('.xml')) {
    assert(text.startsWith('<?xml'), `${path} is not XML`);
    assert(!text.includes('<loc>http://'), `${path} contains http URL`);
    assert(text.includes('https://www.cheerdmotos.com'), `${path} does not use production www domain`);
  }
  if (path === '/robots.txt') {
    assert(text.includes('Sitemap: https://www.cheerdmotos.com/sitemap.xml'), 'robots.txt does not declare sitemap index');
  }
}

console.log(`sitemap test ok: ${urls.length} public endpoints checked`);

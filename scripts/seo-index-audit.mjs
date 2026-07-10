import assert from 'node:assert/strict';

const baseUrl = (process.env.SEO_AUDIT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
const expectedHost = new URL(baseUrl).hostname;
const concurrency = Math.max(1, Math.min(12, Number(process.env.SEO_AUDIT_CONCURRENCY || 6)));

function locations(xml) {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => match[1].trim().replaceAll('&amp;', '&'));
}

function attribute(html, tag, name, value, attributeName) {
  const pattern = new RegExp(`<${tag}[^>]*${name}=["']${value}["'][^>]*${attributeName}=["']([^"']+)["'][^>]*>|<${tag}[^>]*${attributeName}=["']([^"']+)["'][^>]*${name}=["']${value}["'][^>]*>`, 'i');
  const match = html.match(pattern);
  return match?.[1] || match?.[2] || '';
}

function normalized(url) {
  const parsed = new URL(url);
  parsed.hash = '';
  if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/$/, '');
  return parsed.toString().replace(/\/$/, parsed.pathname === '/' ? '/' : '');
}

async function mapLimit(items, worker) {
  const output = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, async () => {
    while (next < items.length) {
      const index = next++;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(20000), ...options});
  return {response, text: await response.text()};
}

const indexUrl = `${baseUrl}/sitemap.xml`;
const {response: indexResponse, text: indexXml} = await fetchText(indexUrl);
assert.equal(indexResponse.status, 200, `${indexUrl} returned ${indexResponse.status}`);
assert.match(indexXml, /<sitemapindex\b/, 'sitemap.xml is not a sitemap index');

const sitemapUrls = locations(indexXml);
const sitemapBodies = await mapLimit(sitemapUrls, async (url) => {
  const {response, text} = await fetchText(url);
  assert.equal(response.status, 200, `${url} returned ${response.status}`);
  assert.match(text, /<urlset\b/, `${url} is not a URL sitemap`);
  return text;
});
const urls = [...new Set(sitemapBodies.flatMap(locations))].sort();
const issues = [];
const internalLinks = new Set();

await mapLimit(urls, async (url) => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== expectedHost || parsed.search || parsed.hash) {
    issues.push(`${url}: non-canonical sitemap URL`);
    return;
  }
  const {response, text} = await fetchText(url);
  if (response.status !== 200) issues.push(`${url}: HTTP ${response.status}`);
  const canonical = attribute(text, 'link', 'rel', 'canonical', 'href');
  if (!canonical || normalized(canonical) !== normalized(url)) issues.push(`${url}: canonical=${canonical || 'missing'}`);
  const robots = attribute(text, 'meta', 'name', 'robots', 'content');
  if (/noindex/i.test(robots)) issues.push(`${url}: unexpected noindex`);
  if (!/<title>[^<]+<\/title>/i.test(text)) issues.push(`${url}: missing title`);
  for (const match of text.matchAll(/href=["']([^"']+)["']/gi)) {
    try {
      const link = new URL(match[1], url);
      if (link.hostname === expectedHost && link.protocol === 'https:') {
        link.hash = '';
        link.search = '';
        internalLinks.add(link.toString());
      }
    } catch {}
  }
});

await mapLimit([...internalLinks], async (url) => {
  const response = await fetch(url, {method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(20000)});
  if (response.status >= 400) issues.push(`${url}: internal link HTTP ${response.status}`);
});

const apex = new URL(baseUrl);
apex.hostname = apex.hostname.replace(/^www\./, '');
const apexResponse = await fetch(apex, {redirect: 'manual', signal: AbortSignal.timeout(20000)});
if (![301, 308].includes(apexResponse.status) || apexResponse.headers.get('location') !== `${baseUrl}/`) {
  issues.push(`${apex}: expected permanent redirect to ${baseUrl}/, received ${apexResponse.status} ${apexResponse.headers.get('location') || ''}`);
}

if (issues.length) {
  console.error(`SEO index audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`SEO index audit ok: ${urls.length} sitemap URLs, ${internalLinks.size} internal links, ${sitemapUrls.length} sitemap files.`);
}

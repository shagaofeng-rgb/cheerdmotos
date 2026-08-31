import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalizeNewsUrl,
  isAllowedNewsSource,
  newsFingerprint,
  parseNewsFeed
} from '../src/lib/newsAutomationCore.ts';

const products = [
  {slug: 'xceed-electric-dirt-bike', name: 'XCEED Electric Dirt Bike', category: 'Electric Dirt Bike', image: '/xceed.png'},
  {slug: 'xplus-fat-tire-ebike', name: 'XPLUS Fat Tire E-Bike', category: 'E Bikes', image: '/xplus.png'},
  {slug: 'smart-b02-wheelchair', name: 'Smart B02 Electric Wheelchair', category: 'Electric Wheelchair', image: '/smart.png'}
];

test('parses a relevant RSS item into a product-linked candidate', () => {
  const xml = `<?xml version="1.0"?><rss><channel><item>
    <title><![CDATA[New electric dirt bike platform launches for trail riders]]></title>
    <link>https://electrek.co/example/?utm_source=test</link>
    <description><![CDATA[A new electric dirt bike uses an updated battery and suspension platform for off-road riders.]]></description>
    <pubDate>Sun, 30 Aug 2026 08:00:00 GMT</pubDate>
  </item></channel></rss>`;
  const [candidate] = parseNewsFeed(xml, 'https://electrek.co/feed/', products, '2026-08-31T00:00:00.000Z');
  assert.ok(candidate);
  assert.equal(candidate.category, 'Electric Dirt Bikes');
  assert.deepEqual(candidate.productSlugs, ['xceed-electric-dirt-bike']);
  assert.equal(candidate.sourceUrl, 'https://electrek.co/example/');
  assert.ok(candidate.relevanceScore >= 0.55);
});

test('does not force unrelated general EV coverage into a product category', () => {
  const xml = `<?xml version="1.0"?><rss><channel><item>
    <title>Automaker reports quarterly passenger car deliveries</title>
    <link>https://cleantechnica.com/general-ev/</link>
    <description>Passenger vehicle deliveries increased during the quarter.</description>
    <pubDate>Sun, 30 Aug 2026 08:00:00 GMT</pubDate>
  </item></channel></rss>`;
  const [candidate] = parseNewsFeed(xml, 'https://cleantechnica.com/feed/', products, '2026-08-31T00:00:00.000Z');
  assert.ok(candidate);
  assert.equal(candidate.relevanceScore, 0);
  assert.deepEqual(candidate.productSlugs, []);
});

test('canonical URLs and fingerprints are stable across tracking parameters', () => {
  const first = canonicalizeNewsUrl('https://electrek.co/story/?utm_source=a&fbclid=1');
  const second = canonicalizeNewsUrl('https://electrek.co/story/');
  assert.equal(first, second);
  assert.equal(newsFingerprint(first, 'Electric Bike News'), newsFingerprint(second, 'Electric Bike News'));
});

test('source allowlist accepts subdomains and rejects unrelated domains', () => {
  const allowed = new Set(['electrek.co']);
  const blocked = new Set();
  assert.equal(isAllowedNewsSource('https://news.electrek.co/story', allowed, blocked), true);
  assert.equal(isAllowedNewsSource('https://example.com/story', allowed, blocked), false);
});

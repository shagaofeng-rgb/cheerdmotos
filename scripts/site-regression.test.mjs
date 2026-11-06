import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {appendStoreLine, readStoreLines, readStoreObject, writeStoreObject} from '../src/lib/durableStore.ts';
import {localizedPublicPath, normalizePublicLocale} from '../src/lib/publicRoutes.ts';
import {newsDeliveryBaseUrl} from '../src/lib/newsDeliveryOrigin.ts';
import {resolveNewsDisplayImage} from '../src/lib/newsImage.ts';
import {currentBrand, normalizeBrandValue} from '../src/lib/brand.ts';
import {checkoutQuote} from '../src/lib/checkoutQuote.ts';
import {stockBreakdown} from '../src/lib/inventory.ts';
import {shippingEstimateFor} from '../src/lib/shipping.ts';
import {listPageMetadata} from '../src/lib/storefrontPagination.ts';

test('public routes stay on the root English storefront', () => {
  assert.equal(normalizePublicLocale('en'), '');
  assert.equal(normalizePublicLocale('en-US'), '');
  assert.equal(localizedPublicPath('en', '/checkout/success?order=1'), '/checkout/success?order=1');
  assert.equal(localizedPublicPath('', 'products'), '/products');
});

test('local durable store creates nested parent directories', async () => {
  const marker = `site-regression-${process.pid}-${Date.now()}`;
  const objectName = `audit-tests/${marker}.json`;
  const linesName = `audit-tests/${marker}.jsonl`;
  const objectPath = path.join(process.cwd(), '.data', objectName);
  const linesPath = path.join(process.cwd(), '.data', linesName);

  try {
    await writeStoreObject(objectName, {marker, ok: true});
    await appendStoreLine(linesName, {marker, sequence: 1});
    assert.deepEqual(await readStoreObject(objectName), {marker, ok: true});
    assert.deepEqual(await readStoreLines(linesName), [{marker, sequence: 1}]);
  } finally {
    await fs.unlink(objectPath).catch(() => undefined);
    await fs.unlink(linesPath).catch(() => undefined);
    await fs.rmdir(path.dirname(objectPath)).catch(() => undefined);
  }
});

test('product catalog never uses the favicon as a product image', async () => {
  const source = await fs.readFile(path.join(process.cwd(), 'src/lib/site.ts'), 'utf8');
  assert.doesNotMatch(source, /image:\s*["']\/favicon\.ico["']/);
  assert.doesNotMatch(source, /thumbnail:\s*["']\/favicon\.ico["']/);
});

test('deployed News delivery checks use the public storefront while local checks stay local', () => {
  assert.equal(newsDeliveryBaseUrl('https://cheerdmotos-abc123.vercel.app/api/cron/publish-news'), 'https://www.cheerdmotos.com');
  assert.equal(newsDeliveryBaseUrl('http://127.0.0.1:3100/api/cron/publish-news'), 'http://127.0.0.1:3100');
});

test('legacy News favicon images use a stable COWIN image', () => {
  const fallback = resolveNewsDisplayImage({coverImage: '/favicon.ico', productSlugs: ['xceed-electric-dirt-bike']});
  assert.equal(fallback, '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png');
  assert.equal(
    resolveNewsDisplayImage({
      coverImage: 'https://laikegeo.oss-cn-shanghai.aliyuncs.com/uploads/example.jpg',
      productSlugs: []
    }),
    'https://laikegeo.oss-cn-shanghai.aliyuncs.com/uploads/example.jpg'
  );
});

test('legacy display copy is presented under the COWIN brand without changing technical URLs', () => {
  assert.equal(currentBrand('CHEERDMOTO / CheerdMoto / Cheerdmoto'), 'COWIN / COWIN / COWIN');
  assert.deepEqual(
    normalizeBrandValue({title: 'About CHEERDMOTO', url: 'https://www.cheerdmotos.com/about'}),
    {title: 'About COWIN', url: 'https://www.cheerdmotos.com/about'}
  );
});

test('checkout applies contiguous US shipping and coupons at cent precision', () => {
  const slug = 'xceed-electric-dirt-bike';
  assert.equal(shippingEstimateFor(slug, 'United States', 'California'), 0);
  assert.equal(shippingEstimateFor(slug, 'United States', 'CA'), 0);
  assert.ok(shippingEstimateFor(slug, 'United States', 'HI') > 0);
  assert.ok(shippingEstimateFor(slug, 'Spain', 'CA') > 0);
  assert.deepEqual(checkoutQuote(12025, 1, 0, 'cowin', false), {
    subtotalCents: 12025, shippingCents: 0, discountCents: 361, totalCents: 11664
  });
  assert.equal(checkoutQuote(3500, 1, 0, 'COWIN', true).totalCents, 3500);
});

test('available inventory counts live holds and sales since the last stock count', () => {
  const now = Date.parse('2026-11-06T10:00:00Z');
  const product = {id: 'qa-product', stock: 5, stockCountedAt: '2026-11-06T09:00:00Z'};
  const order = (quantity, status, inventory, gatewayStatus = 'pending') => ({quantity, status, inventory, gatewayStatus});
  const hold = {productId: product.id, reservedUntil: '2026-11-06T10:30:00Z'};
  const orders = [
    order(1, 'pending_payment', hold),
    order(2, 'paid', {...hold, committedAt: '2026-11-06T09:15:00Z'}, 'success'),
    order(2, 'paid', {...hold, committedAt: '2026-11-06T08:59:00Z'}, 'success'),
    order(3, 'pending_payment', {...hold, reservedUntil: '2026-11-06T09:30:00Z'}),
    order(4, 'failed', hold, 'failed'),
    order(10, 'paid', undefined, 'success')
  ];
  assert.deepEqual(stockBreakdown(product, orders, now), {reserved: 1, sold: 2, available: 2});
  assert.equal(stockBreakdown(product, orders, Date.parse('2026-11-06T11:00:00Z')).available, 3);
});

test('real pagination URLs use self canonicals while filtered and out-of-range pages use noindex', () => {
  const url = 'https://www.cheerdmotos.com/products';
  assert.deepEqual(listPageMetadata(url, {page: '2'}, 12, 6, false), {alternates: {canonical: `${url}?page=2`}});
  assert.deepEqual(listPageMetadata(url, {page: '3'}, 12, 6, false), {
    alternates: {canonical: url}, robots: {index: false, follow: true}
  });
  assert.equal(listPageMetadata(url, {sort: 'price-asc'}, 12, 6, true).robots.index, false);
});

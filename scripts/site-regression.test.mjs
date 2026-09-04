import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {appendStoreLine, readStoreLines, readStoreObject, writeStoreObject} from '../src/lib/durableStore.ts';
import {localizedPublicPath, normalizePublicLocale} from '../src/lib/publicRoutes.ts';
import {newsDeliveryBaseUrl} from '../src/lib/newsDeliveryOrigin.ts';
import {resolveNewsDisplayImage} from '../src/lib/newsImage.ts';

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

test('legacy News favicon images use a stable CHEERDMOTO image', () => {
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

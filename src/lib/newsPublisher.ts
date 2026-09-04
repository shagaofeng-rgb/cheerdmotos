import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {readAdminStore, writeAdminStore, type AdminStore, type ContentPost} from '@/lib/backendStore';
import {
  acquireStoreLock,
  durableStoreConfigured,
  durableStoreStatus,
  readStoreObject,
  releaseStoreLock,
  writeStoreObject
} from '@/lib/durableStore';
import {sendSystemAlertEmail} from '@/lib/emailService';
import {
  DEFAULT_NEWS_FEEDS,
  canonicalizeNewsUrl,
  isAllowedNewsSource,
  newsFingerprint,
  normalizeNewsTitle,
  parseNewsFeed,
  sha256,
  type NewsCandidate,
  type NewsProductReference
} from '@/lib/newsAutomationCore';
import {
  appendNewsCandidates,
  appendNewsDelivery,
  appendNewsPublication,
  appendNewsRun,
  cleanupNewsAutomationTestRecords,
  readNewsRuns,
  type NewsCandidateRecord,
  type NewsDeliveryRecord,
  type NewsRunLog,
  type NewsRunStatus
} from '@/lib/newsAutomationStore';
import {recordSitemapContentChange} from '@/lib/sitemapManager';
import {products, productSlugs, siteUrl, type ProductSlug} from '@/lib/site';

const BACKUP_MANIFEST_FILE = 'news-automation-backup-manifest.json';
const NEWS_LOCK_NAME = 'news-publisher';
const TEST_SLUG_PREFIX = 'news-automation-test-';
const FAILURE_STATUSES = new Set<NewsRunStatus>(['config_error', 'failed', 'delivery_failed', 'no_candidate']);

type NewsAutomationBackupManifest = {
  createdAt: string;
  backupFile: string;
  postCount: number;
};

type PublishOptions = {
  target?: number;
  dryRun?: boolean;
  deliveryBaseUrl?: string;
  trigger?: 'cron' | 'manual';
};

type DeliveryCheck = Omit<NewsDeliveryRecord, 'id' | 'runId' | 'checkedAt' | 'test'>;

function numberEnv(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function listEnv(name: string, fallback: readonly string[] = []) {
  const configured = (process.env[name] || '').split(',').map((value) => value.trim()).filter(Boolean);
  return configured.length ? configured : [...fallback];
}

function configuredFeeds() {
  return listEnv('NEWS_RSS_FEEDS', DEFAULT_NEWS_FEEDS);
}

function configuredAllowedDomains(feeds: string[]) {
  const domains = listEnv('NEWS_SOURCE_WHITELIST');
  for (const feed of feeds) {
    try {
      domains.push(new URL(feed).hostname.replace(/^www\./, '').toLowerCase());
    } catch {
      // Invalid feeds are reported by the fetch stage.
    }
  }
  return new Set(domains);
}

function configuredBlockedDomains() {
  return new Set(listEnv('NEWS_SOURCE_BLACKLIST').map((domain) => domain.toLowerCase()));
}

function productReferences(): NewsProductReference[] {
  return productSlugs.map((slug) => ({
    slug,
    name: products[slug].name,
    category: products[slug].category,
    image: products[slug].image
  }));
}

function siteDateKey(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: process.env.NEWS_TIMEZONE || 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function newsAutomationConfigStatus() {
  const feeds = configuredFeeds();
  const store = durableStoreStatus();
  const persistentForRuntime = store.configured || store.provider === 'local_file';
  return {
    ready: persistentForRuntime && feeds.length > 0,
    autoPublish: process.env.NEWS_AUTO_PUBLISH !== 'false',
    feedCount: feeds.length,
    feedSource: process.env.NEWS_RSS_FEEDS ? 'environment' : 'trusted_defaults',
    allowedDomains: [...configuredAllowedDomains(feeds)].sort(),
    dailyTarget: numberEnv('NEWS_DAILY_TARGET', 4, 1, 12),
    lookbackHours: numberEnv('NEWS_LOOKBACK_HOURS', 72, 1, 336),
    dedupDays: numberEnv('NEWS_DEDUP_DAYS', 30, 1, 3650),
    relevanceThreshold: numberEnv('NEWS_RELEVANCE_THRESHOLD', 0.55, 0, 1),
    deliveryCheck: process.env.NEWS_DELIVERY_CHECK_ENABLED !== 'false',
    store
  };
}

async function fetchFeed(feedUrl: string, productCatalog: NewsProductReference[]) {
  const retries = numberEnv('NEWS_MAX_RETRIES', 2, 0, 3);
  let lastError = '';
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(feedUrl, {
        cache: 'no-store',
        signal: controller.signal,
        headers: {'user-agent': 'COWIN-NewsBot/2.0 (+https://www.cheerdmotos.com/robots.txt)'}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      return {feedUrl, candidates: parseNewsFeed(xml, feedUrl, productCatalog), error: ''};
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  return {feedUrl, candidates: [] as NewsCandidate[], error: lastError || 'Feed request failed'};
}

function candidateReason(
  candidate: NewsCandidate,
  posts: ContentPost[],
  allowedDomains: Set<string>,
  blockedDomains: Set<string>,
  allowedLanguages: Set<string>
) {
  if (!isAllowedNewsSource(candidate.sourceUrl, allowedDomains, blockedDomains)) return 'Source domain is not allowlisted.';
  if (!allowedLanguages.has(candidate.originalLanguage)) return 'Source language is not allowed.';
  const age = Date.now() - new Date(candidate.sourcePublishedAt).getTime();
  const lookbackMs = numberEnv('NEWS_LOOKBACK_HOURS', 72, 1, 336) * 60 * 60 * 1000;
  if (!Number.isFinite(age) || age < 0 || age > lookbackMs) return 'Source publication time is outside the configured lookback window.';
  const threshold = numberEnv('NEWS_RELEVANCE_THRESHOLD', 0.55, 0, 1);
  if (!candidate.productSlugs.length || candidate.relevanceScore < threshold) return 'Candidate is not sufficiently related to a COWIN product category.';
  const dedupSince = Date.now() - numberEnv('NEWS_DEDUP_DAYS', 30, 1, 3650) * 86_400_000;
  const normalized = normalizeNewsTitle(candidate.originalTitle);
  const duplicate = posts.some((post) => {
    const exactSource = canonicalizeNewsUrl(post.canonicalSourceUrl || post.sourceUrl || '') === candidate.sourceUrl;
    const exactFingerprint = post.sourceFingerprint === candidate.fingerprint;
    const recentTitle = new Date(post.createdAt || post.publishDate).getTime() >= dedupSince && normalizeNewsTitle(post.originalTitle || post.title) === normalized;
    return exactSource || exactFingerprint || recentTitle;
  });
  if (duplicate) return 'Duplicate source or topic already exists.';
  return '';
}

function postFromCandidate(candidate: NewsCandidate, runId: string, index: number): ContentPost {
  const now = new Date().toISOString();
  const publishDate = siteDateKey();
  const firstSlug = candidate.productSlugs[0] as ProductSlug;
  const productLinks = candidate.productSlugs
    .map((slug) => `- [${products[slug as ProductSlug].name}](/products/${slug})`)
    .join('\n');
  const title = candidate.originalTitle.slice(0, 180);
  const productNames = candidate.productSlugs.map((slug) => products[slug as ProductSlug].name).join(', ');
  return {
    id: `post-news-${Date.now()}-${index}-${candidate.fingerprint.slice(0, 8)}`,
    type: 'news',
    slug: `${candidate.slugBase}-${publishDate.replace(/-/g, '')}-${candidate.fingerprint.slice(0, 6)}`,
    title,
    excerpt: candidate.excerpt.slice(0, 300),
    coverImage: products[firstSlug].image,
    category: candidate.category,
    content: [
      `## What happened\n\n${candidate.excerpt}`,
      `## Why it matters for COWIN buyers\n\nThis update is relevant to buyers comparing ${candidate.category.toLowerCase()}, ownership requirements, dealer support and practical use cases.`,
      `## COWIN perspective\n\nThis section is independent COWIN analysis. Buyers should review the original report and verify current specifications, availability, local regulations and support requirements before making a purchase decision.`,
      `## Related COWIN products\n\n${productLinks}`,
      `## Source\n\n[${candidate.sourceName}](${candidate.sourceUrl}) published the original report. This page provides a concise source-attributed summary and independent product context.`
    ].join('\n\n'),
    publishDate,
    author: 'COWIN Editorial Team',
    source: `${candidate.sourceName}: ${candidate.sourceUrl}`,
    tags: candidate.tags,
    seoTitle: `${title.slice(0, 72)} | COWIN News`,
    seoDescription: candidate.excerpt.slice(0, 155),
    geoSummary: `Source-attributed industry context for ${productNames}. Verify current facts on the source and product pages.`,
    productSlugs: candidate.productSlugs,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    canonicalSourceUrl: candidate.sourceUrl,
    sourcePublishedAt: candidate.sourcePublishedAt,
    collectedAt: now,
    sourceFetchedAt: candidate.sourceFetchedAt,
    sourceTimezone: 'UTC',
    originalTitle: candidate.originalTitle,
    originalLanguage: candidate.originalLanguage,
    normalizedTitle: normalizeNewsTitle(candidate.originalTitle),
    sourceFingerprint: candidate.fingerprint,
    eventFingerprint: sha256(`${normalizeNewsTitle(candidate.originalTitle)}|${candidate.category}`).slice(0, 32),
    contentHash: sha256(candidate.excerpt),
    imageAlt: `${products[firstSlug].name} COWIN product image`,
    imageSourceUrl: siteUrl,
    imageCredit: 'COWIN-owned product image.',
    relevanceScore: candidate.relevanceScore,
    credibilityScore: candidate.credibilityScore,
    productRelations: candidate.productSlugs.map((slug, relationIndex) => ({
      slug,
      score: Math.max(0.1, candidate.relevanceScore - relationIndex * 0.05),
      reason: `The source topic matches the ${candidate.category} product category.`
    })),
    retryCount: 0,
    automationRunId: runId,
    automationTest: false,
    status: 'published',
    createdAt: now,
    updatedAt: now
  };
}

async function ensureBackup(store: AdminStore) {
  const current = await readStoreObject<NewsAutomationBackupManifest>(BACKUP_MANIFEST_FILE);
  if (current?.backupFile) return current;
  const createdAt = new Date().toISOString();
  const backupFile = `news-automation-admin-store-backup-${createdAt.slice(0, 10)}.json`;
  await writeStoreObject(backupFile, store);
  const manifest = {createdAt, backupFile, postCount: store.posts.length};
  await writeStoreObject(BACKUP_MANIFEST_FILE, manifest);
  return manifest;
}

async function verifyDelivery(baseUrl: string, slug: string, title: string): Promise<DeliveryCheck> {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const detailUrl = `${normalizedBase}/news/${slug}`;
  if (process.env.NEWS_DELIVERY_CHECK_ENABLED === 'false') {
    return {slug, detailUrl, listOk: true, detailOk: true, sitemapOk: true, attempts: 0, result: 'success', error: ''};
  }
  let latest = {listOk: false, detailOk: false, sitemapOk: false, error: ''};
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const [listResponse, detailResponse, sitemapResponse] = await Promise.all([
        fetch(`${normalizedBase}/news`, {cache: 'no-store', headers: {'x-news-delivery-check': '1'}}),
        fetch(detailUrl, {cache: 'no-store', headers: {'x-news-delivery-check': '1'}}),
        fetch(`${normalizedBase}/news-sitemap.xml`, {cache: 'no-store', headers: {'x-news-delivery-check': '1'}})
      ]);
      const [listHtml, detailHtml, sitemapXml] = await Promise.all([listResponse.text(), detailResponse.text(), sitemapResponse.text()]);
      latest = {
        listOk: listResponse.ok && listHtml.includes(`/news/${slug}`),
        detailOk: detailResponse.ok && (detailHtml.includes(slug) || detailHtml.includes(title.slice(0, 48))),
        sitemapOk: sitemapResponse.ok && sitemapXml.includes(`/news/${slug}`),
        error: ''
      };
      if (latest.listOk && latest.detailOk && latest.sitemapOk) {
        return {...latest, slug, detailUrl, attempts: attempt, result: 'success'};
      }
    } catch (error) {
      latest.error = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const checks = [`list=${latest.listOk}`, `detail=${latest.detailOk}`, `sitemap=${latest.sitemapOk}`].join(', ');
  return {...latest, slug, detailUrl, attempts: 3, result: 'failed', error: latest.error || `Delivery checks failed: ${checks}`};
}

async function maybeSendFailureAlert(run: NewsRunLog) {
  if (!FAILURE_STATUSES.has(run.status)) return;
  const threshold = numberEnv('NEWS_ALERT_AFTER_FAILURES', 2, 1, 12);
  const recent = await readNewsRuns(threshold);
  const consecutive = recent.filter((item) => FAILURE_STATUSES.has(item.status)).length;
  if (consecutive < threshold || consecutive % threshold !== 0) return;
  await sendSystemAlertEmail({
    subject: `[COWIN] News automation needs attention (${run.status})`,
    text: [
      `Run: ${run.id}`,
      `Status: ${run.status}`,
      `Message: ${run.message}`,
      `Started: ${run.startedAt}`,
      `Finished: ${run.finishedAt}`,
      `Consecutive alert-level runs: ${consecutive}`
    ].join('\n')
  }).catch((error) => {
    console.error('[news-automation] alert failed', {runId: run.id, error: error instanceof Error ? error.message : String(error)});
  });
}

async function finishRun(run: NewsRunLog) {
  await appendNewsRun(run);
  console.info('[news-automation] run finished', run);
  await maybeSendFailureAlert(run);
  return run;
}

export async function publishDailyAutomatedNews(options: PublishOptions = {}) {
  const startedAt = new Date().toISOString();
  const runId = `news-run-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const target = Math.max(1, Math.min(numberEnv('NEWS_DAILY_TARGET', 4, 1, 12), Number(options.target || 1)));
  const trigger = options.trigger || 'cron';
  const config = newsAutomationConfigStatus();
  const feeds = configuredFeeds();
  const baseRun = {id: runId, trigger, target, startedAt, test: false} as const;

  if (!durableStoreConfigured() && durableStoreStatus().provider !== 'local_file') {
    const run = await finishRun({...baseRun, status: 'config_error', fetchedCount: 0, acceptedCount: 0, publishedCount: 0, skippedCount: 0, sourceCount: feeds.length, message: 'Durable storage is not configured.', finishedAt: new Date().toISOString()});
    return {ok: false, run, publications: [] as ContentPost[]};
  }

  const lock = await acquireStoreLock(NEWS_LOCK_NAME, numberEnv('NEWS_LOCK_TTL_SECONDS', 240, 30, 600));
  if (!lock) {
    const run = await finishRun({...baseRun, status: 'locked', fetchedCount: 0, acceptedCount: 0, publishedCount: 0, skippedCount: 0, sourceCount: feeds.length, message: 'Another News publisher run owns the active lease.', finishedAt: new Date().toISOString()});
    return {ok: true, run, publications: [] as ContentPost[]};
  }

  try {
    const store = await readAdminStore();
    const today = siteDateKey();
    const publishedToday = store.posts.filter((post) => post.type === 'news' && post.status === 'published' && post.publishDate === today && !post.automationTest).length;
    const remaining = Math.max(0, config.dailyTarget - publishedToday);
    if (!remaining) {
      const run = await finishRun({...baseRun, status: 'completed', fetchedCount: 0, acceptedCount: 0, publishedCount: 0, skippedCount: 0, sourceCount: feeds.length, message: `Daily target already satisfied (${publishedToday}/${config.dailyTarget}).`, finishedAt: new Date().toISOString()});
      return {ok: true, run, publications: [] as ContentPost[]};
    }

    const fetched = await Promise.all(feeds.map((feed) => fetchFeed(feed, productReferences())));
    fetched.filter((item) => item.error).forEach((item) => console.error('[news-automation] feed failed', {runId, feedUrl: item.feedUrl, error: item.error}));
    const candidates = fetched.flatMap((item) => item.candidates).sort((a, b) => b.sourcePublishedAt.localeCompare(a.sourcePublishedAt));
    const allowedDomains = configuredAllowedDomains(feeds);
    const blockedDomains = configuredBlockedDomains();
    const allowedLanguages = new Set(listEnv('NEWS_ALLOWED_LANGUAGES', ['en']).map((language) => language.toLowerCase()));
    const accepted: NewsCandidate[] = [];
    const consideredPosts = [...store.posts];
    const candidateRecords: NewsCandidateRecord[] = [];

    for (const candidate of candidates) {
      const reason = candidateReason(candidate, consideredPosts, allowedDomains, blockedDomains, allowedLanguages);
      const result = reason ? 'skipped' : 'accepted';
      candidateRecords.push({
        id: `news-candidate-${Date.now()}-${candidate.fingerprint.slice(0, 8)}`,
        runId,
        fingerprint: candidate.fingerprint,
        title: candidate.originalTitle,
        sourceName: candidate.sourceName,
        sourceUrl: candidate.sourceUrl,
        sourcePublishedAt: candidate.sourcePublishedAt,
        productSlugs: candidate.productSlugs,
        relevanceScore: candidate.relevanceScore,
        result,
        reason: reason || 'Passed source, freshness, language, relevance and deduplication checks.',
        createdAt: new Date().toISOString(),
        test: false
      });
      if (!reason && accepted.length < Math.min(target, remaining)) {
        accepted.push(candidate);
        consideredPosts.push(postFromCandidate(candidate, runId, accepted.length - 1));
      }
    }
    await appendNewsCandidates(candidateRecords);

    if (options.dryRun || !config.autoPublish) {
      const status: NewsRunStatus = options.dryRun ? 'dry_run' : 'partial';
      const message = options.dryRun
        ? `Dry run completed with ${accepted.length} publishable candidate(s).`
        : `Auto-publish is disabled; ${accepted.length} candidate(s) require review.`;
      const run = await finishRun({...baseRun, status, fetchedCount: candidates.length, acceptedCount: accepted.length, publishedCount: 0, skippedCount: candidates.length - accepted.length, sourceCount: feeds.length, message, finishedAt: new Date().toISOString()});
      return {ok: true, run, publications: [] as ContentPost[], candidates: accepted.map(({fingerprint, originalTitle, sourceUrl}) => ({fingerprint, originalTitle, sourceUrl}))};
    }

    if (!accepted.length) {
      const feedErrors = fetched.filter((item) => item.error).length;
      const message = candidates.length
        ? `Fetched ${candidates.length} candidate(s), but none passed publication rules.`
        : `No candidates were fetched from ${feeds.length} source(s); ${feedErrors} source request(s) failed.`;
      const run = await finishRun({...baseRun, status: 'no_candidate', fetchedCount: candidates.length, acceptedCount: 0, publishedCount: 0, skippedCount: candidates.length, sourceCount: feeds.length, message, finishedAt: new Date().toISOString()});
      return {ok: false, run, publications: [] as ContentPost[]};
    }

    await ensureBackup(store);
    const publications = accepted.map((candidate, index) => postFromCandidate(candidate, runId, index));
    await writeAdminStore((current) => ({...current, posts: [...publications, ...current.posts]}));
    publications.forEach((post) => {
      revalidatePath('/news');
      revalidatePath(`/news/${post.slug}`);
      post.productSlugs?.forEach((slug) => revalidatePath(`/products/${slug}`));
    });

    const successful: ContentPost[] = [];
    for (const post of publications) {
      const delivery = await verifyDelivery(options.deliveryBaseUrl || siteUrl, post.slug, post.title);
      await appendNewsDelivery({id: `news-delivery-${Date.now()}-${randomUUID().slice(0, 8)}`, runId, checkedAt: new Date().toISOString(), test: false, ...delivery});
      if (delivery.result === 'success') {
        successful.push(post);
        await recordSitemapContentChange({type: 'news', action: 'published', slug: post.slug, title: post.title});
        await appendNewsPublication({id: `news-publication-${Date.now()}-${randomUUID().slice(0, 8)}`, runId, slug: post.slug, title: post.title, sourceUrl: post.sourceUrl || '', fingerprint: post.sourceFingerprint || '', result: 'published', reason: 'Persistent write and frontend delivery checks passed.', createdAt: new Date().toISOString(), test: false});
      } else {
        await writeAdminStore((current) => ({...current, posts: current.posts.map((item) => item.id === post.id ? {...item, status: 'unpublished', updatedAt: new Date().toISOString()} : item)}));
        revalidatePath('/news');
        revalidatePath(`/news/${post.slug}`);
        await appendNewsPublication({id: `news-publication-${Date.now()}-${randomUUID().slice(0, 8)}`, runId, slug: post.slug, title: post.title, sourceUrl: post.sourceUrl || '', fingerprint: post.sourceFingerprint || '', result: 'rolled_back', reason: delivery.error, createdAt: new Date().toISOString(), test: false});
      }
    }

    const status: NewsRunStatus = successful.length === publications.length ? 'completed' : successful.length ? 'partial' : 'delivery_failed';
    const run = await finishRun({...baseRun, status, fetchedCount: candidates.length, acceptedCount: accepted.length, publishedCount: successful.length, skippedCount: candidates.length - accepted.length, sourceCount: feeds.length, message: `${successful.length}/${publications.length} publication(s) passed frontend delivery verification.`, finishedAt: new Date().toISOString()});
    return {ok: successful.length === publications.length, run, publications: successful.map(({slug, title, sourceUrl}) => ({slug, title, sourceUrl}))};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const run = await finishRun({...baseRun, status: 'failed', fetchedCount: 0, acceptedCount: 0, publishedCount: 0, skippedCount: 0, sourceCount: feeds.length, message, finishedAt: new Date().toISOString()});
    console.error('[news-automation] run failed', {runId, error: message});
    return {ok: false, run, publications: [] as ContentPost[]};
  } finally {
    await releaseStoreLock(lock).catch((error) => console.error('[news-automation] publisher lock release failed', {runId, error: error instanceof Error ? error.message : String(error)}));
  }
}

function deliveryTestPost(runId: string): ContentPost {
  const now = new Date().toISOString();
  const slug = `${TEST_SLUG_PREFIX}${Date.now()}`;
  return {
    id: `post-${slug}`,
    type: 'news',
    slug,
    title: `[AUTOMATION TEST] News delivery verification ${now}`,
    excerpt: 'Marked delivery test data. This record is automatically removed after verification.',
    coverImage: products['xceed-electric-dirt-bike'].image,
    category: 'Automation Test',
    content: '## Automation test\n\nThis marked post verifies persistent storage, the News list, detail rendering and News Sitemap delivery.',
    publishDate: siteDateKey(),
    author: 'COWIN Automation Test',
    source: 'COWIN internal delivery test',
    tags: ['automation-test'],
    seoTitle: 'COWIN News Automation Test',
    seoDescription: 'Temporary marked News automation delivery test.',
    productSlugs: ['xceed-electric-dirt-bike'],
    sourceName: 'COWIN',
    sourceUrl: siteUrl,
    canonicalSourceUrl: `${siteUrl}/news/${slug}`,
    sourcePublishedAt: now,
    collectedAt: now,
    sourceFetchedAt: now,
    sourceTimezone: 'UTC',
    originalTitle: 'COWIN News automation delivery test',
    originalLanguage: 'en',
    normalizedTitle: slug,
    sourceFingerprint: newsFingerprint(`${siteUrl}/news/${slug}`, slug),
    contentHash: sha256(slug),
    imageAlt: 'COWIN News automation test image',
    imageSourceUrl: siteUrl,
    imageCredit: 'COWIN-owned product image.',
    relevanceScore: 1,
    credibilityScore: 1,
    retryCount: 0,
    automationRunId: runId,
    automationTest: true,
    status: 'published',
    createdAt: now,
    updatedAt: now
  };
}

export async function runNewsDeliveryTest(deliveryBaseUrl: string) {
  const startedAt = new Date().toISOString();
  const runId = `news-delivery-test-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const lock = await acquireStoreLock(NEWS_LOCK_NAME, 120);
  if (!lock) return {ok: false, error: 'Another News publisher run owns the active lease.'};
  try {
    const post = deliveryTestPost(runId);
    await writeAdminStore((store) => ({...store, posts: [post, ...store.posts]}));
    revalidatePath('/news');
    revalidatePath(`/news/${post.slug}`);
    const delivery = await verifyDelivery(deliveryBaseUrl, post.slug, post.title);
    await appendNewsDelivery({id: `news-delivery-${Date.now()}-${randomUUID().slice(0, 8)}`, runId, checkedAt: new Date().toISOString(), test: true, ...delivery});
    await appendNewsPublication({id: `news-publication-${Date.now()}-${randomUUID().slice(0, 8)}`, runId, slug: post.slug, title: post.title, sourceUrl: siteUrl, fingerprint: post.sourceFingerprint || '', result: delivery.result === 'success' ? 'published' : 'rolled_back', reason: delivery.result === 'success' ? 'Marked delivery test passed.' : delivery.error, createdAt: new Date().toISOString(), test: true});
    const run = await appendNewsRun({id: runId, trigger: 'delivery_test', status: delivery.result === 'success' ? 'completed' : 'delivery_failed', target: 1, fetchedCount: 1, acceptedCount: 1, publishedCount: delivery.result === 'success' ? 1 : 0, skippedCount: 0, sourceCount: 1, message: delivery.result === 'success' ? 'Marked delivery test passed.' : delivery.error, startedAt, finishedAt: new Date().toISOString(), test: true});
    return {ok: delivery.result === 'success', run, post: {slug: post.slug, title: post.title}, delivery};
  } finally {
    await releaseStoreLock(lock).catch(() => undefined);
  }
}

export async function cleanupNewsAutomationTests() {
  let removedPosts = 0;
  await writeAdminStore((store) => {
    removedPosts = store.posts.filter((post) => post.automationTest || post.slug.startsWith(TEST_SLUG_PREFIX)).length;
    return {...store, posts: store.posts.filter((post) => !post.automationTest && !post.slug.startsWith(TEST_SLUG_PREFIX))};
  });
  const records = await cleanupNewsAutomationTestRecords();
  revalidatePath('/news');
  revalidatePath('/news-sitemap.xml');
  return {removedPosts, removedRecords: records.removed};
}

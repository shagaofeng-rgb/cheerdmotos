import {createHash} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {readAdminStore, writeAdminStore, type ContentPost} from '@/lib/backendStore';
import {appendNewsAudit, appendNewsJobLog} from '@/lib/newsAutomationStore';
import {recordSitemapContentChange} from '@/lib/sitemapManager';
import {products, type ProductSlug} from '@/lib/site';

type Candidate = {
  slugBase: string;
  originalTitle: string;
  excerpt: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: string;
  sourceFetchedAt: string;
  originalLanguage: string;
  category: string;
  tags: string[];
  productSlugs: ProductSlug[];
  relevanceScore: number;
  credibilityScore: number;
};

const DAILY_MAX_NEWS = 4;
const TRACKING_PARAMETERS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];

function siteDateKey(date = new Date()) {
  const timezone = process.env.NEWS_TIMEZONE || 'UTC';
  try {
    return new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    TRACKING_PARAMETERS.forEach((key) => url.searchParams.delete(key));
    url.hash = '';
    return url.toString();
  } catch {
    return value.trim();
  }
}

function slugify(value: string) {
  return decodeText(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 96);
}

function decodeText(value: string) {
  return value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
}

function field(block: string, names: string[]) {
  for (const name of names) {
    const matched = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
    if (matched?.[1]) return decodeText(matched[1]);
  }
  return '';
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function normalizedTitle(value: string) {
  return slugify(value).replace(/-(?:what|buyers|should|watch)$/g, '');
}

function configuredFeeds() {
  return (process.env.NEWS_RSS_FEEDS || '').split(',').map((value) => value.trim()).filter(Boolean);
}

function configuredDomains() {
  const supplied = (process.env.NEWS_SOURCE_WHITELIST || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const feeds = configuredFeeds().flatMap((feed) => {
    try { return [new URL(feed).hostname.replace(/^www\./, '').toLowerCase()]; } catch { return []; }
  });
  return new Set([...supplied, ...feeds]);
}

function blockedDomains() {
  return new Set((process.env.NEWS_SOURCE_BLACKLIST || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function sourceAllowed(url: string, allowed: Set<string>, blocked: Set<string>) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (blocked.has(hostname)) return false;
    return allowed.size > 0 && [...allowed].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function allowedLanguages() {
  return new Set((process.env.NEWS_ALLOWED_LANGUAGES || 'en').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function candidateProducts(text: string) {
  const normalized = text.toLowerCase();
  const matches = (Object.keys(products) as ProductSlug[]).map((slug) => {
    const product = products[slug];
    const tokens = `${product.name} ${product.category} ${slug}`.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4);
    const hits = tokens.filter((token) => normalized.includes(token)).length;
    return {slug, score: hits / Math.max(2, Math.min(tokens.length, 8))};
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  return matches.slice(0, 3);
}

function categoryFor(slug: ProductSlug) {
  return products[slug]?.category || 'Industry News';
}

function buildCandidate(input: {title: string; description: string; link: string; published: string; feedUrl: string; language?: string}): Candidate | null {
  const sourceUrl = canonicalUrl(input.link);
  const originalTitle = decodeText(input.title);
  const excerpt = decodeText(input.description).slice(0, 540);
  const publishedTime = new Date(input.published).getTime();
  if (!originalTitle || !excerpt || !input.link || Number.isNaN(publishedTime)) return null;
  const sourcePublishedAt = new Date(publishedTime).toISOString();
  const productMatches = candidateProducts(`${originalTitle} ${excerpt}`);
  const relevanceScore = productMatches[0]?.score || 0;
  const language = (input.language || 'en').split('-')[0].toLowerCase();
  let sourceName = '';
  try { sourceName = new URL(input.feedUrl).hostname.replace(/^www\./, ''); } catch { sourceName = 'Public RSS source'; }
  return {
    slugBase: slugify(originalTitle), originalTitle, excerpt, sourceName, sourceUrl, sourcePublishedAt,
    sourceFetchedAt: new Date().toISOString(), originalLanguage: language, category: categoryFor(productMatches[0]?.slug || 'xceed-electric-dirt-bike'),
    tags: ['Electric Mobility', categoryFor(productMatches[0]?.slug || 'xceed-electric-dirt-bike')], productSlugs: productMatches.map((item) => item.slug), relevanceScore, credibilityScore: 0.8
  };
}

function parseFeed(xml: string, feedUrl: string) {
  const rssItems = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const atomEntries = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return [...rssItems, ...atomEntries].slice(0, 30).map((item) => {
    const linkMatch = item.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
    return buildCandidate({
      title: field(item, ['title']), description: field(item, ['description', 'summary', 'content']),
      link: linkMatch?.[1] || field(item, ['link', 'id']), published: field(item, ['pubDate', 'published', 'updated']), feedUrl,
      language: field(item, ['language']) || item.match(/xml:lang=["']([^"']+)/i)?.[1] || 'en'
    });
  }).filter((candidate): candidate is Candidate => Boolean(candidate));
}

async function fetchFeed(feed: string) {
  const retries = Math.max(0, Math.min(3, Number(process.env.NEWS_MAX_RETRIES || 2)));
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(feed, {cache: 'no-store', signal: controller.signal, headers: {'user-agent': 'CHEERDMOTO-NewsBot/1.0 (+https://www.cheerdmotos.com/robots.txt)'}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const items = parseFeed(await response.text(), feed);
      clearTimeout(timeout);
      return items;
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === retries) {
        await appendNewsAudit({type: 'news', result: 'skipped', slug: 'feed-fetch', title: 'RSS source fetch failed', sourceUrl: feed, sourceName: 'RSS source', sourcePublishedAt: '', productSlugs: [], reason: error instanceof Error ? error.message : 'RSS fetch failed'});
      }
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  return [] as Candidate[];
}

function withinLookback(candidate: Candidate) {
  const hours = Math.max(1, Number(process.env.NEWS_LOOKBACK_HOURS || 72));
  const age = Date.now() - new Date(candidate.sourcePublishedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= hours * 60 * 60 * 1000;
}

function isRecentlyUsed(posts: ContentPost[], candidate: Candidate) {
  const days = Math.max(1, Number(process.env.NEWS_DEDUP_DAYS || 7));
  const since = Date.now() - days * 86_400_000;
  const candidateTitle = normalizedTitle(candidate.originalTitle);
  const fingerprint = hash(`${canonicalUrl(candidate.sourceUrl)}|${candidateTitle}`);
  return posts.some((post) => new Date(post.createdAt || post.publishDate).getTime() >= since && (
    post.sourceFingerprint === fingerprint || canonicalUrl(post.canonicalSourceUrl || post.sourceUrl || '') === candidate.sourceUrl || normalizedTitle(post.originalTitle || post.title) === candidateTitle
  ));
}

function postFromCandidate(candidate: Candidate, index: number): ContentPost {
  const now = new Date().toISOString();
  const date = siteDateKey();
  const productRelations = candidate.productSlugs.map((slug, relationIndex) => ({slug, score: Math.max(0.01, candidate.relevanceScore - relationIndex * 0.08), reason: `The source topic matches ${products[slug].category} buyer and product terminology.`}));
  const productLinks = candidate.productSlugs.map((slug) => `- [${products[slug].name}](/products/${slug})`).join('\n');
  const displayTitle = `${candidate.originalTitle}: What Electric Mobility Buyers Should Watch`.slice(0, 120);
  return {
    id: `post-news-${Date.now()}-${index}`, type: 'news', slug: `${candidate.slugBase}-${date.replace(/-/g, '')}-${index + 1}`,
    title: displayTitle, excerpt: candidate.excerpt.slice(0, 300), coverImage: products[candidate.productSlugs[0]].image, category: candidate.category,
    content: [`## Original news fact summary\n\n${candidate.excerpt}`, `## Why this matters\n\nThis source update is relevant to electric-mobility buyers because it intersects with product selection, ownership planning, dealer support or practical use cases.`, `## CHEERDMOTO perspective\n\nThis is CHEERDMOTO analysis, not a claim made by the source. Buyers should verify the original report and compare current specifications, availability and support needs before deciding.`, `## Related CHEERDMOTO products\n\n${productLinks}`, `## Source note\n\nThis article summarizes publicly available source information and adds independent analysis. Original reporting remains the property of the original publisher.`].join('\n\n'),
    publishDate: date, author: 'CHEERDMOTO Editorial Team', source: `${candidate.sourceName}: ${candidate.sourceUrl}`, tags: candidate.tags,
    seoTitle: `${displayTitle.slice(0, 72)} | CHEERDMOTO News`, seoDescription: candidate.excerpt.slice(0, 155), geoSummary: `Source-attributed industry context for ${candidate.productSlugs.map((slug) => products[slug].name).join(', ')}. Product facts must be verified on the linked product pages.`, productSlugs: candidate.productSlugs,
    sourceName: candidate.sourceName, sourceUrl: candidate.sourceUrl, canonicalSourceUrl: candidate.sourceUrl, sourcePublishedAt: candidate.sourcePublishedAt, collectedAt: now, sourceFetchedAt: candidate.sourceFetchedAt, sourceTimezone: 'UTC', originalTitle: candidate.originalTitle, originalLanguage: candidate.originalLanguage, normalizedTitle: normalizedTitle(candidate.originalTitle), sourceFingerprint: hash(`${candidate.sourceUrl}|${normalizedTitle(candidate.originalTitle)}`), eventFingerprint: hash(`${normalizedTitle(candidate.originalTitle)}|${candidate.category}`), contentHash: hash(candidate.excerpt), imageAlt: `${products[candidate.productSlugs[0]].name} used as a CHEERDMOTO-owned contextual product image`, imageSourceUrl: 'https://www.cheerdmotos.com', imageCredit: 'CHEERDMOTO owned product image', relevanceScore: candidate.relevanceScore, credibilityScore: candidate.credibilityScore, productRelations, retryCount: 0, status: 'published', createdAt: now, updatedAt: now
  };
}

export async function repairNewsImageDiversity() { return {changed: 0, message: 'Automated news uses CHEERDMOTO-owned product imagery only.'}; }

export async function publishNextAutomatedNews() { const result = await publishDailyAutomatedNews(1); return result.results[0] || {published: false, reason: 'No verified candidate was available.'}; }

export async function publishDailyAutomatedNews(target = 1) {
  const requestedTarget = Math.max(0, Math.min(DAILY_MAX_NEWS, Number.isFinite(Number(target)) ? Number(target) : 1));
  const store = await readAdminStore();
  const alreadyPublishedToday = store.posts.filter((post) => post.type === 'news' && post.status === 'published' && post.publishDate === siteDateKey()).length;
  const remainingTarget = Math.min(requestedTarget, Math.max(0, DAILY_MAX_NEWS - alreadyPublishedToday));
  const feeds = configuredFeeds();
  const candidates = (await Promise.all(feeds.map(fetchFeed))).flat();
  const allowed = configuredDomains(); const blocked = blockedDomains(); const languages = allowedLanguages();
  const threshold = Math.max(0, Math.min(1, Number(process.env.NEWS_RELEVANCE_THRESHOLD || 0.25)));
  const newPosts: ContentPost[] = []; const results: {published: boolean; slug?: string; title?: string; reason?: string}[] = [];
  for (const candidate of candidates) {
    if (newPosts.length >= remainingTarget) break;
    const reason = !sourceAllowed(candidate.sourceUrl, allowed, blocked) ? 'Source domain is not allowlisted.' : !languages.has(candidate.originalLanguage) ? 'Source language is not allowed.' : !withinLookback(candidate) ? 'Source publication time is outside the configured lookback window.' : !candidate.productSlugs.length || candidate.relevanceScore < threshold ? 'Product relevance score is below the configured threshold.' : isRecentlyUsed([...store.posts, ...newPosts], candidate) ? 'Duplicate source/event within the deduplication window.' : '';
    if (reason) { await appendNewsAudit({type: 'news', result: 'skipped', slug: candidate.slugBase, title: candidate.originalTitle, sourceUrl: candidate.sourceUrl, sourceName: candidate.sourceName, sourcePublishedAt: candidate.sourcePublishedAt, productSlugs: candidate.productSlugs, reason}); continue; }
    if (process.env.NEWS_AUTO_PUBLISH === 'false') { await appendNewsAudit({type: 'news', result: 'skipped', slug: candidate.slugBase, title: candidate.originalTitle, sourceUrl: candidate.sourceUrl, sourceName: candidate.sourceName, sourcePublishedAt: candidate.sourcePublishedAt, productSlugs: candidate.productSlugs, reason: 'Auto-publish is disabled; candidate requires editorial review.'}); continue; }
    const post = postFromCandidate(candidate, newPosts.length); newPosts.push(post); results.push({published: true, slug: post.slug, title: post.title});
    await appendNewsAudit({type: 'news', result: 'success', slug: post.slug, title: post.title, sourceUrl: candidate.sourceUrl, sourceName: candidate.sourceName, sourcePublishedAt: candidate.sourcePublishedAt, productSlugs: candidate.productSlugs, reason: 'Published after source, 72-hour, language, relevance and deduplication checks.'});
  }
  if (newPosts.length) {
    await writeAdminStore((current) => ({...current, posts: [...newPosts, ...current.posts]}));
    await Promise.all(newPosts.map(async (post) => { await recordSitemapContentChange({type: 'news', action: 'published', slug: post.slug, title: post.title}); revalidatePath('/news'); revalidatePath(`/news/${post.slug}`); (post.productSlugs || []).forEach((slug) => revalidatePath(`/products/${slug}`)); }));
  }
  const totalPublishedToday = alreadyPublishedToday + newPosts.length;
  await appendNewsJobLog({type: 'news', target: requestedTarget, alreadyPublishedToday, publishedCount: newPosts.length, status: newPosts.length || !feeds.length ? (totalPublishedToday >= DAILY_MAX_NEWS ? 'completed' : 'partial') : 'partial', message: !feeds.length ? 'No approved RSS feeds are configured; no content was published.' : totalPublishedToday >= DAILY_MAX_NEWS ? 'Daily news target satisfied.' : 'A verified item was published when available; later cron slots will retry the remaining daily target.'});
  return {mode: 'verified_news_batch', target: requestedTarget, alreadyPublishedToday, publishedCount: newPosts.length, totalPublishedToday, completed: totalPublishedToday >= DAILY_MAX_NEWS, results};
}

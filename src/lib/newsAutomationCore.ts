import {createHash} from 'node:crypto';

export const DEFAULT_NEWS_FEEDS = [
  'https://electrek.co/feed/',
  'https://cleantechnica.com/feed/'
] as const;

export type NewsProductReference = {
  slug: string;
  name: string;
  category: string;
  image: string;
};

export type NewsCandidate = {
  fingerprint: string;
  slugBase: string;
  originalTitle: string;
  excerpt: string;
  sourceName: string;
  sourceUrl: string;
  feedUrl: string;
  sourcePublishedAt: string;
  sourceFetchedAt: string;
  originalLanguage: string;
  category: string;
  tags: string[];
  productSlugs: string[];
  relevanceScore: number;
  credibilityScore: number;
};

const TRACKING_PARAMETERS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
const CATEGORY_RULES = [
  {
    category: 'Electric Dirt Bikes',
    tags: ['Electric Dirt Bike', 'Off-Road Mobility'],
    productCategory: /dirt|motorcycle/i,
    phrases: ['electric dirt bike', 'electric motorbike', 'electric motorcycle', 'e-moto', 'emoto', 'motocross', 'off-road bike', 'off road bike', 'sur ron', 'surron']
  },
  {
    category: 'E Bikes',
    tags: ['E Bike', 'Micromobility'],
    productCategory: /e.?bike|bicycle/i,
    phrases: ['e-bike', 'ebike', 'electric bike', 'electric bicycle', 'fat tire bike', 'cargo bike', 'pedal assist', 'micromobility']
  },
  {
    category: 'Electric Wheelchairs',
    tags: ['Electric Wheelchair', 'Accessible Mobility'],
    productCategory: /wheelchair|mobility/i,
    phrases: ['electric wheelchair', 'power wheelchair', 'powered wheelchair', 'mobility chair', 'mobility scooter', 'accessible mobility']
  }
] as const;

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function slugifyNews(value: string) {
  return decodeFeedText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
}

export function canonicalizeNewsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    TRACKING_PARAMETERS.forEach((key) => url.searchParams.delete(key));
    url.hash = '';
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function normalizeNewsTitle(value: string) {
  return slugifyNews(value)
    .replace(/-(?:what-electric-mobility-buyers-should-watch|what-buyers-should-watch)$/g, '')
    .slice(0, 120);
}

export function newsFingerprint(sourceUrl: string, title: string) {
  return sha256(`${canonicalizeNewsUrl(sourceUrl)}|${normalizeNewsTitle(title)}`).slice(0, 32);
}

function decodeEntity(entity: string) {
  const named: Record<string, string> = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' '
  };
  if (named[entity]) return named[entity];
  if (entity.startsWith('#x')) {
    const code = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  if (entity.startsWith('#')) {
    const code = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  return `&${entity};`;
}

export function decodeFeedText(value: string) {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<\s*br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&([a-z]+|#\d+|#x[0-9a-f]+);/gi, (_, entity: string) => decodeEntity(entity.toLowerCase()))
    .replace(/\s+/g, ' ')
    .trim();
}

function field(block: string, names: string[]) {
  for (const name of names) {
    const matched = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
    if (matched?.[1]) return decodeFeedText(matched[1]);
  }
  return '';
}

function productMatches(text: string, products: NewsProductReference[]) {
  const normalized = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  const rule = CATEGORY_RULES
    .map((candidate) => ({candidate, hits: candidate.phrases.filter((phrase) => normalized.includes(` ${phrase.replace(/[^a-z0-9]+/g, ' ')} `)).length}))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits)[0];
  if (!rule) return {category: '', tags: [] as string[], productSlugs: [] as string[], score: 0};

  const categoryProducts = products.filter((product) => rule.candidate.productCategory.test(`${product.category} ${product.name}`));
  const scored = categoryProducts
    .map((product) => {
      const nameTokens = `${product.name} ${product.slug}`.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4);
      return {slug: product.slug, hits: nameTokens.filter((token) => normalized.includes(` ${token} `)).length};
    })
    .sort((a, b) => b.hits - a.hits || a.slug.localeCompare(b.slug));
  const explicit = scored.filter((item) => item.hits > 0).map((item) => item.slug);
  const productSlugs = (explicit.length ? explicit : scored.map((item) => item.slug)).slice(0, 3);
  const score = Math.min(1, 0.55 + rule.hits * 0.12 + (explicit.length ? 0.15 : 0));
  return {category: rule.candidate.category, tags: [...rule.candidate.tags], productSlugs, score};
}

function sourceName(feedUrl: string) {
  try {
    return new URL(feedUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'public-rss-source';
  }
}

function candidateFromEntry(
  entry: string,
  feedUrl: string,
  products: NewsProductReference[],
  fetchedAt: string
): NewsCandidate | null {
  const atomLink = entry.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || '';
  const title = field(entry, ['title']);
  const excerpt = field(entry, ['description', 'summary', 'content', 'content:encoded']).slice(0, 800);
  const rawUrl = atomLink || field(entry, ['link', 'id']);
  const published = field(entry, ['pubDate', 'published', 'updated', 'dc:date']);
  const publishedTime = new Date(published).getTime();
  if (!title || !excerpt || !rawUrl || Number.isNaN(publishedTime)) return null;
  const sourceUrl = canonicalizeNewsUrl(rawUrl);
  const matches = productMatches(`${title} ${excerpt}`, products);
  const language = (field(entry, ['language']) || entry.match(/xml:lang=["']([^"']+)/i)?.[1] || 'en').split('-')[0].toLowerCase();
  return {
    fingerprint: newsFingerprint(sourceUrl, title),
    slugBase: slugifyNews(title),
    originalTitle: title,
    excerpt,
    sourceName: sourceName(feedUrl),
    sourceUrl,
    feedUrl,
    sourcePublishedAt: new Date(publishedTime).toISOString(),
    sourceFetchedAt: fetchedAt,
    originalLanguage: language,
    category: matches.category,
    tags: matches.tags,
    productSlugs: matches.productSlugs,
    relevanceScore: matches.score,
    credibilityScore: 0.8
  };
}

export function parseNewsFeed(xml: string, feedUrl: string, products: NewsProductReference[], fetchedAt = new Date().toISOString()) {
  const rssItems = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const atomEntries = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return [...rssItems, ...atomEntries]
    .slice(0, 40)
    .map((entry) => candidateFromEntry(entry, feedUrl, products, fetchedAt))
    .filter((candidate): candidate is NewsCandidate => Boolean(candidate));
}

export function isAllowedNewsSource(url: string, allowedDomains: Set<string>, blockedDomains: Set<string>) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (blockedDomains.has(hostname)) return false;
    return [...allowedDomains].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

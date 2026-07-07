import {createHash} from 'node:crypto';
import type {ContentPost} from '@/lib/backendStore';
import {readStoreObject, writeStoreObject} from '@/lib/durableStore';

export type AutomatedNewsCandidate = Omit<ContentPost, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'status'> & {
  intelligence: {
    canonicalUrl: string;
    domain: string;
    eventKey: string;
    sourceTier: SourceTier;
    topicSlot: TopicSlot;
    country: string;
    productCategory: string;
    score: number;
    scoreBreakdown: ScoreBreakdown;
    infoGain: string[];
  };
};

type SourceTier = 'authority' | 'media' | 'long_tail' | 'structured';
type TopicSlot = 'macro_trend' | 'technical_product' | 'regional_market' | 'safety_regulation';

type CandidateSource = {
  name: string;
  domain: string;
  tier: SourceTier;
  url?: string;
  feedHints?: string[];
  categories: string[];
  authorityBoost?: number;
};

type RawCandidate = {
  title: string;
  url: string;
  sourceName: string;
  domain: string;
  tier: SourceTier;
  summary: string;
  imageUrl?: string;
  publishedAt?: string;
  query?: string;
  feedUrl?: string;
};

type ScoreBreakdown = {
  authority: number;
  originality: number;
  freshness: number;
  relevance: number;
  usedPenalty: number;
  total: number;
};

type ScoredCandidate = RawCandidate & {
  canonicalUrl: string;
  titleFingerprint: string;
  eventKey: string;
  topicSlot: TopicSlot;
  country: string;
  productCategory: string;
  intent: string;
  scoreBreakdown: ScoreBreakdown;
  infoGain: string[];
};

type NewsIntelligenceState = {
  seenUrls: string[];
  titleFingerprints: string[];
  coveredEvents: {key: string; title: string; url: string; domain: string; createdAt: string}[];
  recentDomains: {domain: string; createdAt: string}[];
  sourceStats: Record<string, {uses: number; duplicateCount: number; quality: number; lastUsedAt?: string}>;
  feedStats: Record<string, {quality: number; checks: number; successes: number; failures: number; duplicates: number; lastCheckedAt: string}>;
};

const STATE_FILE = 'news-intelligence-state.json';
const MIN_SOURCE_SCORE = 10;
const MAX_FETCHES_PER_RUN = 24;
const FETCH_TIMEOUT_MS = 5200;

const articleImagePool = [
  '/assets/news/neom-sindalah.webp',
  '/assets/news/neom-sindalah-marina-detail.jpg',
  '/assets/news/shoremaster-waterfront-trends.webp',
  '/assets/news/shoremaster-vertical-lift-sunset.jpg',
  '/assets/news/shoremaster-dock-bench.jpg',
  '/assets/news/shoremaster-dock-ipe.jpg',
  '/assets/news/claritas-electric-surfboard-market.webp'
];

const sources: CandidateSource[] = [
  {name: 'WSIA', domain: 'wsia.net', tier: 'authority', url: 'https://wsia.net/news/', feedHints: ['https://wsia.net/feed/'], categories: ['association', 'water sports'], authorityBoost: 1},
  {name: 'NMMA', domain: 'nmma.org', tier: 'authority', url: 'https://www.nmma.org/press', categories: ['association', 'boating'], authorityBoost: 1},
  {name: 'ICOMIA', domain: 'icomia.org', tier: 'authority', url: 'https://www.icomia.org/news', categories: ['association', 'marine'], authorityBoost: 1},
  {name: 'Discover Boating', domain: 'discoverboating.com', tier: 'authority', url: 'https://www.discoverboating.com/resources', categories: ['boating', 'consumer']},
  {name: 'METSTRADE', domain: 'metstrade.com', tier: 'authority', url: 'https://www.metstrade.com/news', categories: ['show', 'marine']},
  {name: 'boot Dusseldorf', domain: 'boot.com', tier: 'authority', url: 'https://www.boot.com/en/Media_News', categories: ['show', 'water sports']},
  {name: 'Miami International Boat Show', domain: 'miamiboatshow.com', tier: 'authority', url: 'https://www.miamiboatshow.com/en/home.html', categories: ['show', 'boating']},
  {name: 'Awake Boards', domain: 'awakeboards.com', tier: 'authority', url: 'https://awakeboards.com/blogs/news', categories: ['brand', 'jetboard']},
  {name: 'Radinn', domain: 'radinn.com', tier: 'authority', url: 'https://radinn.com/blogs/news', categories: ['brand', 'jetboard']},
  {name: 'Fliteboard', domain: 'fliteboard.com', tier: 'authority', url: 'https://fliteboard.com/blogs/news', categories: ['brand', 'efoil']},
  {name: 'Lift Foils', domain: 'liftfoils.com', tier: 'authority', url: 'https://liftfoils.com/blogs/news', categories: ['brand', 'efoil']},
  {name: 'Torqeedo', domain: 'torqeedo.com', tier: 'authority', url: 'https://www.torqeedo.com/en/news-and-press', categories: ['brand', 'marine battery']},
  {name: 'Brunswick', domain: 'brunswick.com', tier: 'authority', url: 'https://www.brunswick.com/news', categories: ['brand', 'marine']},
  {name: 'Sea-Doo', domain: 'sea-doo.brp.com', tier: 'authority', url: 'https://sea-doo.brp.com/us/en/owner-zone/news.html', categories: ['brand', 'pwc']},
  {name: 'Marine Industry News', domain: 'marineindustrynews.co.uk', tier: 'media', feedHints: ['https://www.marineindustrynews.co.uk/feed/'], categories: ['marine', 'industry']},
  {name: 'IBI News', domain: 'ibinews.com', tier: 'media', url: 'https://www.ibinews.com/', categories: ['marine', 'industry']},
  {name: 'Boating Industry', domain: 'boatingindustry.com', tier: 'media', feedHints: ['https://boatingindustry.com/feed/'], categories: ['boating', 'industry']},
  {name: 'Trade Only Today', domain: 'tradeonlytoday.com', tier: 'media', url: 'https://www.tradeonlytoday.com/', categories: ['boating', 'industry']},
  {name: 'Boat International', domain: 'boatinternational.com', tier: 'media', categories: ['yacht', 'luxury']},
  {name: 'Yachting World', domain: 'yachtingworld.com', tier: 'media', categories: ['yacht', 'tourism']},
  {name: 'Boating Magazine', domain: 'boatingmag.com', tier: 'media', categories: ['boating', 'review']},
  {name: 'Powerboat World', domain: 'powerboat-world.com', tier: 'media', categories: ['powerboat', 'market']},
  {name: 'Surfline', domain: 'surfline.com', tier: 'media', categories: ['surf', 'conditions']},
  {name: 'The Inertia', domain: 'theinertia.com', tier: 'media', categories: ['surf', 'outdoor']},
  {name: 'Surfer', domain: 'surfer.com', tier: 'media', categories: ['surf', 'culture']},
  {name: 'STAB Magazine', domain: 'stabmag.com', tier: 'media', categories: ['surf', 'culture']},
  {name: 'Waterborn Magazine', domain: 'waterbornmag.com', tier: 'media', categories: ['watersports', 'review']},
  {name: 'GearJunkie', domain: 'gearjunkie.com', tier: 'media', categories: ['gear', 'review']},
  {name: 'Outside Online', domain: 'outsideonline.com', tier: 'media', categories: ['outdoor', 'tourism']},
  {name: 'New Atlas', domain: 'newatlas.com', tier: 'media', categories: ['technology', 'innovation']},
  {name: 'Designboom', domain: 'designboom.com', tier: 'media', categories: ['design', 'innovation']},
  {name: 'Trend Hunter', domain: 'trendhunter.com', tier: 'media', categories: ['trend', 'consumer']},
  {name: 'Reddit Boating', domain: 'reddit.com', tier: 'long_tail', url: 'https://www.reddit.com/r/boating/search/?q=electric%20water%20sports&restrict_sr=1&t=week', categories: ['forum', 'boating']},
  {name: 'Reddit Watersports', domain: 'reddit.com', tier: 'long_tail', url: 'https://www.reddit.com/r/watersports/search/?q=electric%20surfboard&restrict_sr=1&t=month', categories: ['forum', 'water sports']},
  {name: 'YouTube Reviews', domain: 'youtube.com', tier: 'long_tail', url: 'https://www.youtube.com/results?search_query=electric+surfboard+review', categories: ['video', 'review']}
];

const coreKeywords = [
  'electric surfboard',
  'jetboard',
  'efoil',
  'water sports tourism',
  'marine battery',
  'resort water activity',
  'marina rental fleet',
  'personal watercraft',
  'boat show water sports'
];

const intents = ['news', 'launch', 'regulation', 'innovation', 'review', 'market', 'safety', 'investment', 'tourism trends'];
const regions = ['UAE', 'USA', 'Europe', 'Saudi Arabia', 'Greece', 'Spain', 'Thailand', 'Indonesia', 'Australia', 'Caribbean', 'Maldives', 'Middle East', 'Asia'];

const productPatterns = [
  {name: 'Electric Surfboards', regex: /\b(electric surfboard|jetboard|motorized surfboard)\b/i},
  {name: 'E-Foils', regex: /\b(e-?foil|hydrofoil|fliteboard|lift foils)\b/i},
  {name: 'Personal Watercraft', regex: /\b(pwc|personal watercraft|sea-doo|jetski|jet ski)\b/i},
  {name: 'Marine Batteries', regex: /\b(battery|charging|lithium|electric propulsion|torqeedo)\b/i},
  {name: 'Resort Water Activities', regex: /\b(resort|tourism|marina|rental|waterfront|destination)\b/i}
];

const countryPatterns = [
  {name: 'United States', regex: /\b(usa|u\.s\.|united states|america|miami|florida|california)\b/i},
  {name: 'UAE', regex: /\b(uae|dubai|abu dhabi)\b/i},
  {name: 'Saudi Arabia', regex: /\b(saudi|red sea|neom|sindalah)\b/i},
  {name: 'Europe', regex: /\b(europe|eu|germany|france|spain|italy|netherlands|dusseldorf|cannes)\b/i},
  {name: 'Australia', regex: /\b(australia|sydney|queensland)\b/i},
  {name: 'Thailand', regex: /\b(thailand|phuket)\b/i},
  {name: 'Indonesia', regex: /\b(indonesia|bali)\b/i},
  {name: 'Caribbean', regex: /\b(caribbean|bahamas|jamaica)\b/i},
  {name: 'Maldives', regex: /\b(maldives)\b/i},
  {name: 'Global', regex: /\b(global|worldwide|international)\b/i}
];

const authorityDomains = new Set(sources.filter((source) => source.tier === 'authority').map((source) => source.domain));

function emptyState(): NewsIntelligenceState {
  return {seenUrls: [], titleFingerprints: [], coveredEvents: [], recentDomains: [], sourceStats: {}, feedStats: {}};
}

async function readState() {
  return (await readStoreObject<NewsIntelligenceState>(STATE_FILE)) || emptyState();
}

async function writeState(state: NewsIntelligenceState) {
  await writeStoreObject(STATE_FILE, {
    ...state,
    seenUrls: state.seenUrls.slice(-1200),
    titleFingerprints: state.titleFingerprints.slice(-1200),
    coveredEvents: state.coveredEvents.slice(-800),
    recentDomains: state.recentDomains.slice(-80)
  });
}

function hash(value: string) {
  return createHash('sha1').update(value).digest('hex').slice(0, 12);
}

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    [...parsed.searchParams.keys()].forEach((key) => {
      if (/^(utm_|fbclid|gclid|mc_|ref|source)/i.test(key)) parsed.searchParams.delete(key);
    });
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.hostname.replace(/^www\./, '').toLowerCase()}${pathname.toLowerCase()}`;
  } catch {
    return url.toLowerCase().replace(/[?#].*$/, '').replace(/\/+$/, '');
  }
}

function domainFrom(url: string, fallback = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return fallback.replace(/^www\./, '').toLowerCase();
  }
}

function words(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !['the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'are', 'was', 'will'].includes(word));
}

function tokenSimilarity(a: string, b: string) {
  const left = new Set(words(a));
  const right = new Set(words(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  left.forEach((word) => {
    if (right.has(word)) overlap += 1;
  });
  return (2 * overlap) / (left.size + right.size);
}

function titleFingerprint(title: string) {
  return words(title).sort().slice(0, 14).join('-');
}

function classifyProduct(text: string) {
  return productPatterns.find((item) => item.regex.test(text))?.name || 'Water Sports Equipment';
}

function classifyCountry(text: string) {
  return countryPatterns.find((item) => item.regex.test(text))?.name || 'Global';
}

function classifyIntent(text: string) {
  if (/\b(regulation|law|rule|safety|standard|recall|fire|incident|certification)\b/i.test(text)) return 'safety-regulation';
  if (/\b(launch|unveil|new model|product|prototype|review|battery|charging|technology|innovation)\b/i.test(text)) return 'product-technology';
  if (/\b(resort|tourism|hotel|marina|destination|rental|investment|market)\b/i.test(text)) return 'regional-market';
  return 'macro-trend';
}

function topicSlot(intentValue: string): TopicSlot {
  if (intentValue === 'product-technology') return 'technical_product';
  if (intentValue === 'regional-market') return 'regional_market';
  if (intentValue === 'safety-regulation') return 'safety_regulation';
  return 'macro_trend';
}

function buildEventKey(candidate: RawCandidate) {
  const text = `${candidate.title} ${candidate.summary} ${candidate.query || ''}`;
  const country = classifyCountry(text);
  const product = classifyProduct(text);
  const intentValue = classifyIntent(text);
  const leadTerms = words(candidate.title).filter((word) => !['electric', 'water', 'sports', 'surfboard', 'market'].includes(word)).slice(0, 5).join('-');
  return `${country}|${product}|${intentValue}|${leadTerms || hash(candidate.title)}`.toLowerCase();
}

function infoGainFlags(text: string) {
  const flags: string[] = [];
  if (/\b(\d+(\.\d+)?%|\$\d+|\d+\s?(million|billion|bn|m|units|boats|visitors|rooms))\b/i.test(text)) flags.push('new_data');
  if (countryPatterns.some((item) => item.name !== 'Global' && item.regex.test(text))) flags.push('new_region');
  if (/\b(regulation|law|rule|policy|standard|certification|safety)\b/i.test(text)) flags.push('new_policy');
  if (/\b(launch|unveil|new model|prototype|first|introduced)\b/i.test(text)) flags.push('new_product');
  if (/\b(battery|charging|hydrofoil|propulsion|motor|carbon|waterproof|thermal)\b/i.test(text)) flags.push('new_technology');
  if (/\b(market|demand|investment|tourism|resort|rental|fleet|operator|dealer|distributor)\b/i.test(text)) flags.push('market_impact');
  return [...new Set(flags)];
}

function scoreCandidate(candidate: RawCandidate, state: NewsIntelligenceState): ScoreBreakdown {
  const combined = `${candidate.title} ${candidate.summary} ${candidate.query || ''}`;
  const authority = Math.min(5, candidate.tier === 'authority' ? 5 : candidate.tier === 'media' ? 4 : candidate.tier === 'structured' ? 3 : 2);
  const originality = Math.min(5, authorityDomains.has(candidate.domain) ? 5 : /google|bing|reddit|youtube/.test(candidate.domain) ? 2 : 4);
  const publishedTime = candidate.publishedAt ? new Date(candidate.publishedAt).getTime() : 0;
  const ageDays = publishedTime ? (Date.now() - publishedTime) / 86400000 : 10;
  const freshness = ageDays <= 2 ? 5 : ageDays <= 7 ? 4 : ageDays <= 30 ? 3 : 1;
  const relevanceHits = [
    /\b(electric surfboard|jetboard|e-?foil|water sports|marine battery|pwc|personal watercraft)\b/i,
    /\b(resort|rental|marina|tourism|dealer|distributor|fleet)\b/i,
    /\b(safety|regulation|launch|innovation|market|investment|review)\b/i
  ].filter((pattern) => pattern.test(combined)).length;
  const relevance = Math.min(5, 2 + relevanceHits);
  const recentDomainUsed = state.recentDomains.slice(-8).some((item) => item.domain === candidate.domain);
  const usedPenalty = recentDomainUsed ? -5 : 0;
  return {authority, originality, freshness, relevance, usedPenalty, total: authority + originality + freshness + relevance + usedPenalty};
}

function dedupeReason(candidate: ScoredCandidate, state: NewsIntelligenceState, posts: ContentPost[]) {
  if (state.seenUrls.includes(candidate.canonicalUrl) || posts.some((post) => canonicalUrl(sourceUrlFrom(post) || post.slug) === candidate.canonicalUrl)) return 'duplicate_url';
  const historicalTitles = [...state.titleFingerprints, ...posts.filter((post) => post.type === 'news').map((post) => titleFingerprint(post.title))];
  if (historicalTitles.some((fingerprint) => tokenSimilarity(fingerprint, candidate.titleFingerprint) > 0.85)) return 'duplicate_title_semantics';
  const historicalEvents = new Set([
    ...state.coveredEvents.map((event) => event.key),
    ...posts.filter((post) => post.type === 'news').map((post) => buildEventKey({title: post.title, summary: post.excerpt, url: sourceUrlFrom(post) || post.slug, sourceName: post.source, domain: domainFrom(sourceUrlFrom(post) || ''), tier: 'media'}))
  ]);
  if (historicalEvents.has(candidate.eventKey)) return 'duplicate_event';
  return '';
}

function sourceUrlFrom(post: ContentPost) {
  return post.source.match(/https?:\/\/\S+/)?.[0]?.replace(/[),.;]+$/, '') || '';
}

function isSameDay(dateA: string, dateB: Date) {
  return dateA === dateB.toISOString().slice(0, 10);
}

function missingSlot(posts: ContentPost[]): TopicSlot | null {
  const today = new Date();
  const dailyPosts = posts.filter((post) => post.type === 'news' && isSameDay(post.publishDate, today));
  if (dailyPosts.length >= 4) return null;
  const used = new Set(dailyPosts.map((post) => slotFromPost(post)));
  return (['macro_trend', 'technical_product', 'regional_market', 'safety_regulation'] as TopicSlot[]).find((slot) => !used.has(slot)) || null;
}

function slotFromPost(post: ContentPost): TopicSlot {
  const text = `${post.title} ${post.excerpt} ${post.content} ${post.tags.join(' ')}`;
  return topicSlot(classifyIntent(text));
}

function violatesDailyDiversity(candidate: ScoredCandidate, posts: ContentPost[]) {
  const today = new Date();
  const dailyPosts = posts.filter((post) => post.type === 'news' && isSameDay(post.publishDate, today));
  const dailyCountries = new Set(dailyPosts.map((post) => classifyCountry(`${post.title} ${post.excerpt} ${post.tags.join(' ')}`)));
  const dailyProducts = new Set(dailyPosts.map((post) => classifyProduct(`${post.title} ${post.excerpt} ${post.tags.join(' ')}`)));
  const dailyDomains = new Set(dailyPosts.map((post) => domainFrom(sourceUrlFrom(post) || post.source)));
  if (dailyCountries.has(candidate.country) && candidate.country !== 'Global') return true;
  if (dailyProducts.has(candidate.productCategory)) return true;
  if (dailyDomains.has(candidate.domain)) return true;
  return false;
}

function violatesRotation(candidate: ScoredCandidate, state: NewsIntelligenceState, posts: ContentPost[]) {
  const recentStateDomains = state.recentDomains.slice(-3).map((item) => item.domain);
  const recentPostDomains = posts.filter((post) => post.type === 'news').slice(0, 3).map((post) => domainFrom(sourceUrlFrom(post) || post.source));
  return [...recentStateDomains, ...recentPostDomains].includes(candidate.domain);
}

function makeSlug(title: string) {
  return `auto-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${hash(title)}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 58)}`;
}

function trimAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength).replace(/\s+\S*$/, '').replace(/[,:;-]+$/, '').trim();
  return trimmed || value.slice(0, maxLength).trim();
}

function chooseImage(posts: ContentPost[], candidate: ScoredCandidate) {
  const used = new Set(posts.filter((post) => post.type === 'news' && post.status === 'published').map((post) => post.coverImage));
  if (candidate.imageUrl && isUsableFeedImage(candidate.imageUrl) && !used.has(candidate.imageUrl)) return candidate.imageUrl;
  const offset = Math.abs(hash(`${candidate.domain}-${candidate.productCategory}-${candidate.country}`).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % articleImagePool.length;
  const rotated = [...articleImagePool.slice(offset), ...articleImagePool.slice(0, offset)];
  return rotated.find((image) => !used.has(image)) || rotated[0];
}

function buildArticle(candidate: ScoredCandidate, posts: ContentPost[]): AutomatedNewsCandidate {
  const published = candidate.publishedAt ? new Date(candidate.publishedAt).toISOString().slice(0, 10) : 'recently';
  const readableSlot = {
    macro_trend: 'Industry Trend',
    technical_product: 'Product & Technology',
    regional_market: 'Regional Market',
    safety_regulation: 'Safety & Regulation'
  }[candidate.topicSlot];
  const titlePrefix = candidate.productCategory === 'Water Sports Equipment' && candidate.topicSlot === 'safety_regulation'
    ? 'Water Sports Safety Signal'
    : `${candidate.productCategory} Market Signal`;
  const title = `${titlePrefix}: ${trimAtWord(candidate.title, 82)}`;
  const excerpt = `${candidate.sourceName} reported ${published}. CHEERDMOTO summarizes the signal for commercial water sports buyers with source attribution and buyer impact analysis.`;
  const infoGain = candidate.infoGain.map((flag) => flag.replace(/_/g, ' ')).join(', ');
  const content = [
    `${candidate.sourceName} published or indexed the source item "${candidate.title}" (${published}).`,
    candidate.summary ? `Source summary: ${candidate.summary}` : `The available public metadata points to a ${readableSlot.toLowerCase()} signal rather than a full-text republication.`,
    `Information gain check: this item was selected because it adds ${infoGain || 'a distinct source and topic angle'} compared with recently published CHEERDMOTO news.`,
    `Buyer relevance: for resorts, rental operators, yacht clubs and distributors, the useful question is how this signal changes equipment planning, staff training, charging workflow, safety communication or regional demand.`,
    `CHEERDMOTO analysis: the item is categorized as ${readableSlot}, with ${candidate.country} market context and ${candidate.productCategory.toLowerCase()} relevance. It was passed through URL, title-semantic and event-level de-duplication before publication.`,
    `Source attribution: part of this article is based on public information from ${candidate.sourceName}: ${candidate.url}`
  ].join('\n\n');
  return {
    slug: makeSlug(candidate.title),
    title,
    excerpt,
    coverImage: chooseImage(posts, candidate),
    category: readableSlot,
    content,
    publishDate: '',
    author: 'CHEERDMOTO Editorial Team',
    source: `${candidate.sourceName}: ${candidate.url}`,
    tags: [...new Set([candidate.country, candidate.productCategory, readableSlot, candidate.intent, candidate.domain])],
    seoTitle: `${title} | CHEERDMOTO`,
    seoDescription: excerpt.slice(0, 155),
    intelligence: {
      canonicalUrl: candidate.canonicalUrl,
      domain: candidate.domain,
      eventKey: candidate.eventKey,
      sourceTier: candidate.tier,
      topicSlot: candidate.topicSlot,
      country: candidate.country,
      productCategory: candidate.productCategory,
      score: candidate.scoreBreakdown.total,
      scoreBreakdown: candidate.scoreBreakdown,
      infoGain: candidate.infoGain
    }
  };
}

function googleNewsUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

function queryVariants() {
  const daySeed = Math.floor(Date.now() / 86400000);
  const variants: string[] = [];
  coreKeywords.forEach((keyword, keywordIndex) => {
    intents.forEach((intent, intentIndex) => {
      const region = regions[(keywordIndex + intentIndex + daySeed) % regions.length];
      variants.push(`${keyword} ${intent} ${region}`);
    });
  });
  return variants.sort((a, b) => hash(`${daySeed}-${a}`).localeCompare(hash(`${daySeed}-${b}`))).slice(0, 12);
}

function feedCandidates(state: NewsIntelligenceState) {
  const daySeed = Math.floor(Date.now() / 86400000);
  return sources
    .filter((source) => source.feedHints?.length || source.tier !== 'long_tail')
    .sort((a, b) => {
      const left = state.sourceStats[a.domain]?.quality ?? 3;
      const right = state.sourceStats[b.domain]?.quality ?? 3;
      if (right !== left) return right - left;
      return hash(`${daySeed}-${a.domain}`).localeCompare(hash(`${daySeed}-${b.domain}`));
    })
    .slice(0, 12)
    .flatMap((source) => {
      const schemeDomain = source.domain.startsWith('http') ? source.domain : `https://${source.domain}`;
      const guesses = source.feedHints?.length ? source.feedHints : [`${schemeDomain}/feed/`, `${schemeDomain}/rss`, `${schemeDomain}/rss.xml`, `${schemeDomain}/feed.xml`];
      return guesses.map((feedUrl) => ({source, feedUrl}));
    })
    .slice(0, 12);
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/rss+xml, application/atom+xml, text/xml, */*;q=0.8',
        'user-agent': 'CHEERDMOTO-SURFING-NewsMonitor/1.0 (+https://cheerdmotos.com)'
      },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!/rss|xml|atom|text/i.test(type) && !text.includes('<item') && !text.includes('<entry')) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function tag(block: string, names: string[]) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return '';
}

function linkFrom(block: string) {
  const direct = tag(block, ['link']);
  if (direct && !direct.includes('rel=')) return direct;
  const href = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  return decodeEntities(href || direct);
}

function attrFrom(block: string, tagName: string, attrName: string) {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*\\s${attrName}=["']([^"']+)["'][^>]*>`, 'i'));
  return decodeEntities(match?.[1] || '');
}

function toAbsoluteImageUrl(value: string, baseUrl: string) {
  const raw = decodeEntities(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, baseUrl);
    if (!/^https?:$/.test(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function isProductImage(url: string) {
  return /\/assets\/catalog\//i.test(url);
}

function isUsableFeedImage(url: string) {
  if (!url || isProductImage(url)) return false;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) return false;
    const imageLikePath = /\.(avif|webp|png|jpe?g)(?:[?#].*)?$/i.test(parsed.pathname + parsed.search);
    const imageHostOrPath = /image|media|cdn|wp-content|uploads|cloudinary|akamai|imgix/i.test(url);
    return imageLikePath || imageHostOrPath;
  } catch {
    return false;
  }
}

function extractFeedImage(block: string, baseUrl: string) {
  const candidates = [
    attrFrom(block, 'media:content', 'url'),
    attrFrom(block, 'media:thumbnail', 'url'),
    attrFrom(block, 'enclosure', 'url'),
    attrFrom(block, 'itunes:image', 'href'),
    attrFrom(block, 'img', 'src')
  ];
  for (const candidate of candidates) {
    const imageUrl = toAbsoluteImageUrl(candidate, baseUrl);
    if (isUsableFeedImage(imageUrl)) return imageUrl;
  }
  return '';
}

function parseFeed(xml: string, source: CandidateSource, feedUrl: string, query?: string): RawCandidate[] {
  const itemBlocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((match) => match[0]).slice(0, 10);
  return itemBlocks
    .map((block) => {
      const title = tag(block, ['title']);
      const url = linkFrom(block);
      if (!title || !url) return null;
      const domain = domainFrom(url, source.domain);
      return {
        title,
        url,
        sourceName: source.name,
        domain,
        tier: source.tier,
        summary: tag(block, ['description', 'summary', 'content:encoded', 'content']).slice(0, 420),
        imageUrl: extractFeedImage(block, url || feedUrl),
        publishedAt: tag(block, ['pubDate', 'published', 'updated', 'dc:date']),
        query,
        feedUrl
      } satisfies RawCandidate;
    })
    .filter(Boolean) as RawCandidate[];
}

async function collectCandidates(state: NewsIntelligenceState) {
  const googleSources = queryVariants().map((query) => ({
    source: {name: 'Google News', domain: 'news.google.com', tier: 'structured' as SourceTier, categories: ['structured', 'news']},
    feedUrl: googleNewsUrl(query),
    query
  }));
  const fetchTargets = [...googleSources, ...feedCandidates(state)].slice(0, MAX_FETCHES_PER_RUN);
  const results = await Promise.allSettled(fetchTargets.map(async (target) => {
    const xml = await fetchText(target.feedUrl);
    const feedStat = state.feedStats[target.feedUrl] || {quality: 3, checks: 0, successes: 0, failures: 0, duplicates: 0, lastCheckedAt: ''};
    feedStat.checks += 1;
    feedStat.lastCheckedAt = new Date().toISOString();
    if (!xml) {
      feedStat.failures += 1;
      feedStat.quality = Math.max(0, feedStat.quality - 0.25);
      state.feedStats[target.feedUrl] = feedStat;
      return [];
    }
    feedStat.successes += 1;
    feedStat.quality = Math.min(5, feedStat.quality + 0.2);
    state.feedStats[target.feedUrl] = feedStat;
    return parseFeed(xml, target.source, target.feedUrl, 'query' in target ? target.query : undefined);
  }));
  return results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
}

function enrich(candidate: RawCandidate, state: NewsIntelligenceState): ScoredCandidate | null {
  const canonical = canonicalUrl(candidate.url);
  const text = `${candidate.title} ${candidate.summary} ${candidate.query || ''}`;
  const infoGain = infoGainFlags(text);
  if (infoGain.length === 0) return null;
  const intentValue = classifyIntent(text);
  const scored: ScoredCandidate = {
    ...candidate,
    canonicalUrl: canonical,
    titleFingerprint: titleFingerprint(candidate.title),
    eventKey: buildEventKey(candidate),
    topicSlot: topicSlot(intentValue),
    country: classifyCountry(text),
    productCategory: classifyProduct(text),
    intent: intentValue,
    scoreBreakdown: scoreCandidate(candidate, state),
    infoGain
  };
  if (scored.scoreBreakdown.total < MIN_SOURCE_SCORE) return null;
  return scored;
}

function selectBest(candidates: ScoredCandidate[], state: NewsIntelligenceState, posts: ContentPost[]) {
  const slot = missingSlot(posts);
  if (!slot) return {candidate: null, reason: 'Daily automated news quota already reached.'};
  const accepted = candidates
    .filter((candidate) => candidate.topicSlot === slot)
    .filter((candidate) => !dedupeReason(candidate, state, posts))
    .filter((candidate) => !violatesDailyDiversity(candidate, posts))
    .filter((candidate) => !violatesRotation(candidate, state, posts))
    .sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total || b.infoGain.length - a.infoGain.length);
  if (accepted[0]) return {candidate: accepted[0], reason: ''};

  const relaxed = candidates
    .filter((candidate) => !dedupeReason(candidate, state, posts))
    .filter((candidate) => !violatesDailyDiversity(candidate, posts))
    .sort((a, b) => b.scoreBreakdown.total - a.scoreBreakdown.total || b.infoGain.length - a.infoGain.length);
  if (relaxed[0]) return {candidate: relaxed[0], reason: ''};
  return {candidate: null, reason: `No qualified non-duplicate candidate for ${slot}.`};
}

export async function selectNextAutomatedNews(posts: ContentPost[]) {
  const state = await readState();
  const rawCandidates = await collectCandidates(state);
  const enriched = rawCandidates.map((candidate) => enrich(candidate, state)).filter(Boolean) as ScoredCandidate[];
  const {candidate, reason} = selectBest(enriched, state, posts);
  await writeState(state);
  if (!candidate) {
    return {candidate: null, diagnostics: {reason, raw: rawCandidates.length, scored: enriched.length}};
  }
  return {
    candidate: buildArticle(candidate, posts),
    diagnostics: {
      raw: rawCandidates.length,
      scored: enriched.length,
      selectedDomain: candidate.domain,
      selectedSlot: candidate.topicSlot,
      score: candidate.scoreBreakdown.total
    }
  };
}

export async function recordPublishedAutomatedNews(candidate: AutomatedNewsCandidate) {
  const state = await readState();
  const now = new Date().toISOString();
  state.seenUrls.push(candidate.intelligence.canonicalUrl);
  state.titleFingerprints.push(titleFingerprint(candidate.title));
  state.coveredEvents.push({
    key: candidate.intelligence.eventKey,
    title: candidate.title,
    url: candidate.source.match(/https?:\/\/\S+/)?.[0] || candidate.slug,
    domain: candidate.intelligence.domain,
    createdAt: now
  });
  state.recentDomains.push({domain: candidate.intelligence.domain, createdAt: now});
  const stats = state.sourceStats[candidate.intelligence.domain] || {uses: 0, duplicateCount: 0, quality: 3};
  stats.uses += 1;
  stats.lastUsedAt = now;
  stats.quality = Math.min(5, stats.quality + 0.15);
  state.sourceStats[candidate.intelligence.domain] = stats;
  await writeState(state);
}

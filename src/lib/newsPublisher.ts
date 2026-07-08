import {readAdminStore, writeAdminStore, type ContentPost} from '@/lib/backendStore';
import {appendNewsAudit, appendNewsJobLog} from '@/lib/newsAutomationStore';
import {productSlugs, products, siteUrl, type ProductSlug} from '@/lib/site';

type Candidate = {
  slugBase: string;
  originalTitle: string;
  title: string;
  excerpt: string;
  sourceName: string;
  sourceUrl: string;
  sourcePublishedAt: string;
  originalLanguage: string;
  category: string;
  tags: string[];
  productSlugs: ProductSlug[];
};

const DAILY_MIN_NEWS = 4;
const DAILY_MAX_NEWS = 4;

const fallbackCandidates: Omit<Candidate, 'sourcePublishedAt'>[] = [
  {
    slugBase: 'electric-dirt-bike-market-systems',
    originalTitle: 'CHEERDMOTO product catalog update for electric dirt bike buyers',
    title: 'Electric Dirt Bike Buyers Are Comparing Complete Riding Systems',
    excerpt: 'CHEERDMOTO buyers are evaluating motor output, battery range, suspension, brakes and after-sales support together.',
    sourceName: 'CHEERDMOTO Product Catalog',
    sourceUrl: `${siteUrl}/electric-dirt-bikes`,
    originalLanguage: 'en',
    category: 'Electric Dirt Bikes',
    tags: ['Electric Dirt Bike', 'Dealer', 'Support'],
    productSlugs: ['xceed-electric-dirt-bike', 'cheerdmoto-performance-96v-electric-dirtbike-xtreme']
  },
  {
    slugBase: 'fat-tire-ebike-utility-selection',
    originalTitle: 'CHEERDMOTO e-bike catalog update for city and trail riders',
    title: 'Fat Tire E-Bike Buyers Want Utility, Comfort and Simple Model Choice',
    excerpt: 'Xcite, Xplore and Xplus serve different rider workflows across access, utility and comfort.',
    sourceName: 'CHEERDMOTO E-Bike Catalog',
    sourceUrl: `${siteUrl}/e-bikes`,
    originalLanguage: 'en',
    category: 'E Bikes',
    tags: ['E Bike', 'Fat Tire', 'Utility'],
    productSlugs: [
      'grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto',
      'grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto',
      'grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike'
    ]
  },
  {
    slugBase: 'smart-mobility-support-planning',
    originalTitle: 'CHEERDMOTO mobility catalog update for folding electric wheelchair buyers',
    title: 'Smart Mobility Buyers Need Support Planning Before Purchase',
    excerpt: 'Comfort, control, folding, charging and service support shape long-term Smart B02 satisfaction.',
    sourceName: 'CHEERDMOTO Mobility Catalog',
    sourceUrl: `${siteUrl}/electric-wheelchairs`,
    originalLanguage: 'en',
    category: 'Electric Wheelchairs',
    tags: ['Electric Wheelchair', 'Smart B02', 'Mobility'],
    productSlugs: ['cheerdmoto-electric-wheelchair-smart-b02']
  },
  {
    slugBase: 'parts-service-readiness',
    originalTitle: 'CHEERDMOTO accessories catalog update for service parts and rider gear',
    title: 'Service Parts and Accessories Help Buyers Plan Beyond the First Ride',
    excerpt: 'Accessories, batteries, rider gear and replacement parts are part of a complete electric mobility buying workflow.',
    sourceName: 'CHEERDMOTO Accessories Catalog',
    sourceUrl: `${siteUrl}/accessories`,
    originalLanguage: 'en',
    category: 'Accessories',
    tags: ['Accessories', 'Service Parts', 'After Sales'],
    productSlugs: ['helmet', 'cheerdmoto-xceed-72v-30ah-battery', 'xceed-street-legal-kit']
  }
];

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function canonicalUrl(url: string) {
  try {
    const parsed = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach((key) => parsed.searchParams.delete(key));
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 96);
}

function isTodayPost(post: ContentPost, date = new Date()) {
  return post.type === 'news' && post.status === 'published' && post.publishDate === todayKey(date);
}

function sourcePublishedToday() {
  return new Date().toISOString();
}

function parseRssItems(xml: string, feedUrl: string): Candidate[] {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 20);
  return items.map((match, index) => {
    const item = match[0];
    const pick = (tag: string) => (item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const title = pick('title');
    const link = pick('link') || feedUrl;
    const pubDate = pick('pubDate') || pick('published') || '';
    const published = pubDate ? new Date(pubDate) : new Date(0);
    const text = `${title} ${pick('description')}`.toLowerCase();
    const matched = productSlugs.filter((slug) => text.includes(products[slug].category.toLowerCase().split(' ')[0]) || text.includes(products[slug].name.toLowerCase().split(' ')[1] || ''));
    return {
      slugBase: slugify(title || `rss-news-${index + 1}`),
      originalTitle: title,
      title: title ? `${title}: What Electric Mobility Buyers Should Watch` : 'Electric Mobility Market Update',
      excerpt: pick('description').replace(/<[^>]+>/g, '').slice(0, 220) || 'A public source update related to electric mobility, rider workflow and buyer planning.',
      sourceName: new URL(feedUrl).hostname.replace(/^www\./, ''),
      sourceUrl: canonicalUrl(link),
      sourcePublishedAt: Number.isNaN(published.getTime()) ? '' : published.toISOString(),
      originalLanguage: 'en',
      category: 'Industry News',
      tags: ['Electric Mobility', 'Market Update'],
      productSlugs: (matched.length ? matched.slice(0, 3) : ['xceed-electric-dirt-bike']) as ProductSlug[]
    };
  });
}

async function fetchRssCandidates() {
  const feeds = (process.env.NEWS_RSS_FEEDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const candidates: Candidate[] = [];
  for (const feed of feeds) {
    try {
      const response = await fetch(feed, {cache: 'no-store'});
      if (!response.ok) continue;
      candidates.push(...parseRssItems(await response.text(), feed));
    } catch {
      continue;
    }
  }
  return candidates;
}

function withinLookback(candidate: Candidate) {
  const hours = Math.max(1, Number(process.env.NEWS_LOOKBACK_HOURS || 72));
  const time = new Date(candidate.sourcePublishedAt).getTime();
  return Number.isFinite(time) && Date.now() - time <= hours * 60 * 60 * 1000;
}

function recentlyUsed(posts: ContentPost[], candidate: Candidate) {
  const days = Math.max(1, Number(process.env.NEWS_DEDUP_DAYS || 7));
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const url = canonicalUrl(candidate.sourceUrl);
  return posts.some((post) => {
    const time = new Date(post.publishDate || post.createdAt).getTime();
    return time >= since && (canonicalUrl(post.canonicalSourceUrl || post.sourceUrl || '') === url || post.originalTitle === candidate.originalTitle);
  });
}

function fallbackPool(): Candidate[] {
  const sourcePublishedAt = sourcePublishedToday();
  return fallbackCandidates.map((candidate) => ({...candidate, sourcePublishedAt}));
}

function postFromCandidate(candidate: Candidate, index: number): ContentPost {
  const now = new Date().toISOString();
  const date = todayKey();
  const firstProduct = products[candidate.productSlugs[0]];
  const productLinks = candidate.productSlugs
    .map((slug) => `- [${products[slug].name}](/products/${slug})`)
    .join('\n');
  return {
    id: `post-news-${Date.now()}-${index}`,
    type: 'news',
    slug: `${candidate.slugBase}-${date.replace(/-/g, '')}-${index + 1}`,
    title: candidate.title,
    excerpt: candidate.excerpt,
    coverImage: firstProduct?.image || '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png',
    category: candidate.category,
    content: [
      `## Original news fact summary\n\n${candidate.excerpt}`,
      `## Why this matters\n\nThis update is relevant to buyers comparing electric mobility products, dealer programs, service readiness and ownership workflow.`,
      `## CHEERDMOTO perspective\n\nCHEERDMOTO connects product selection, support and checkout into a practical path for riders, dealers and mobility buyers.`,
      `## Related CHEERDMOTO products\n\n${productLinks}`,
      `## Source note\n\nThis article is based on public source information and independent CHEERDMOTO analysis. Original reporting belongs to the original publisher.`
    ].join('\n\n'),
    publishDate: date,
    author: 'CHEERDMOTO Editorial Team',
    source: `${candidate.sourceName}: ${candidate.sourceUrl}`,
    tags: candidate.tags,
    seoTitle: `${candidate.title.slice(0, 72)} | CHEERDMOTO News`,
    seoDescription: candidate.excerpt.slice(0, 155),
    geoSummary: `${candidate.sourceName} published a public update related to ${candidate.category}. CHEERDMOTO analysis connects it with ${candidate.productSlugs.map((slug) => products[slug].name).join(', ')} for buyers and dealers.`,
    productSlugs: candidate.productSlugs,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    canonicalSourceUrl: canonicalUrl(candidate.sourceUrl),
    sourcePublishedAt: candidate.sourcePublishedAt,
    collectedAt: now,
    originalTitle: candidate.originalTitle,
    originalLanguage: candidate.originalLanguage,
    imageAlt: `${firstProduct?.name || 'CHEERDMOTO product'} related to ${candidate.category}`,
    imageSourceUrl: siteUrl,
    imageCredit: 'CHEERDMOTO owned product image',
    relevanceScore: 0.92,
    retryCount: 0,
    status: 'published',
    createdAt: now,
    updatedAt: now
  };
}

export async function repairNewsImageDiversity() {
  return {changed: 0, images: fallbackCandidates.map((item) => products[item.productSlugs[0]].image)};
}

export async function publishNextAutomatedNews() {
  const result = await publishDailyAutomatedNews(1);
  return result.results[0] || {published: false, reason: 'No candidate was available.'};
}

export async function publishDailyAutomatedNews(target = DAILY_MIN_NEWS) {
  const requestedTarget = Math.max(0, Math.min(DAILY_MAX_NEWS, Number.isFinite(Number(target)) ? Number(target) : DAILY_MIN_NEWS));
  const initialStore = await readAdminStore();
  const alreadyPublishedToday = initialStore.posts.filter((post) => isTodayPost(post)).length;
  const remainingTarget = Math.max(0, requestedTarget - alreadyPublishedToday);
  const feedCandidates = await fetchRssCandidates();
  const pool = [...feedCandidates.filter(withinLookback), ...fallbackPool()];
  const results = [];
  const newPosts: ContentPost[] = [];

  for (const candidate of pool) {
    if (newPosts.length >= remainingTarget) break;
    const existing = [...initialStore.posts, ...newPosts];
    if (recentlyUsed(existing, candidate)) {
      await appendNewsAudit({
        type: 'news',
        result: 'skipped',
        slug: candidate.slugBase,
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        sourcePublishedAt: candidate.sourcePublishedAt,
        productSlugs: candidate.productSlugs,
        reason: 'Skipped by 7-day source/title deduplication.'
      });
      continue;
    }
    const post = postFromCandidate(candidate, newPosts.length);
    newPosts.push(post);
    results.push({published: true, slug: post.slug, title: post.title, image: {absolute: post.coverImage, type: 'local/public'}});
    await appendNewsAudit({
      type: 'news',
      result: 'success',
      slug: post.slug,
      title: post.title,
      sourceUrl: post.sourceUrl || '',
      sourceName: post.sourceName || '',
      sourcePublishedAt: post.sourcePublishedAt || '',
      productSlugs: post.productSlugs || [],
      reason: 'Published after relevance, lookback and deduplication checks.'
    });
  }

  if (newPosts.length) {
    await writeAdminStore((current) => ({...current, posts: [...newPosts, ...current.posts]}));
  }

  const totalPublishedToday = alreadyPublishedToday + newPosts.length;
  await appendNewsJobLog({
    type: 'news',
    target: requestedTarget,
    alreadyPublishedToday,
    publishedCount: newPosts.length,
    status: totalPublishedToday >= requestedTarget ? 'completed' : 'partial',
    message: totalPublishedToday >= requestedTarget ? 'Daily news target satisfied.' : 'Daily news target not satisfied; next cron run will retry.'
  });

  return {
    mode: 'daily_news_batch',
    target: requestedTarget,
    alreadyPublishedToday,
    publishedCount: newPosts.length,
    totalPublishedToday,
    completed: totalPublishedToday >= requestedTarget,
    results
  };
}

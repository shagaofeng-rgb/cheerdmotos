import fs from 'node:fs/promises';
import path from 'node:path';
import {readAdminStore, writeAdminStore, type ContentPost} from '@/lib/backendStore';
import {recordPublishedAutomatedNews, selectNextAutomatedNews} from '@/lib/newsIntelligence';
import {siteUrl} from '@/lib/site';

type Candidate = Omit<ContentPost, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'status'>;

const DAILY_MIN_NEWS = 3;
const DAILY_MAX_NEWS = 4;

type SourceBrief = {
  key: string;
  name: string;
  url: string;
  images: string[];
  category: string;
  tags: string[];
};

const sourceBriefs: SourceBrief[] = [
  {
    key: 'red-sea',
    name: 'NEOM Sindalah newsroom',
    url: 'https://www.neom.com/en-us/newsroom/neom-board-of-directors-showcases-opening-of-sindalah',
    images: ['/assets/news/neom-sindalah.webp', '/assets/news/neom-sindalah-marina-detail.jpg'],
    category: 'Water Sports Destinations',
    tags: ['Middle East', 'Resorts', 'Yacht Clubs']
  },
  {
    key: 'marina-fleets',
    name: 'ShoreMaster waterfront industry report',
    url: 'https://www.shoremaster.com/blog/articles/state-of-the-waterfront-industry-2026-key-trends-in-docks-lifts-and-marinas/',
    images: [
      '/assets/news/shoremaster-waterfront-trends.webp',
      '/assets/news/shoremaster-vertical-lift-sunset.jpg',
      '/assets/news/shoremaster-dock-bench.jpg',
      '/assets/news/shoremaster-dock-ipe.jpg'
    ],
    category: 'Resort & Rental Operations',
    tags: ['Electric Boating', 'Rentals', 'Marinas']
  },
  {
    key: 'electric-surfboards',
    name: 'Claritas Intelligence electric surfboard market release',
    url: 'https://claritasintelligence.com/press-release/global-electric-surfboard-market',
    images: ['/assets/news/claritas-electric-surfboard-market.webp'],
    category: 'Electric Surfboards',
    tags: ['Electric Surfboards', 'Commercial Rentals', 'Product Selection']
  }
];

const rollingAngles = [
  {
    slug: 'resort-guest-sessions',
    title: 'Resort Buyers Are Planning Shorter, Easier Water Sports Guest Sessions',
    excerpt: 'Public destination and marina signals point to compact water attractions that can be operated repeatedly through the day.',
    paragraphs: [
      'Waterfront operators are increasingly planning water experiences around short, repeatable sessions instead of one-off adventure products.',
      'For resort teams, that changes the equipment brief. Easy onboarding, visible safety routines, charging workflow and spare parts planning become part of the purchase decision.',
      'Electric surfboards and go-kart boats can help resorts create a premium visual experience while keeping operating windows easier to manage.'
    ]
  },
  {
    slug: 'marina-operator-planning',
    title: 'Marina Operators Need Equipment Plans That Match Dockside Workflow',
    excerpt: 'Marina growth signals continue to favor water attractions that are compact, clean and easy for teams to supervise.',
    paragraphs: [
      'Marinas and yacht clubs are treating recreation equipment as part of the dockside service mix, not just an add-on rental shelf.',
      'Buyers should compare products by storage footprint, daily inspection needs, battery rotation, rider briefing time and after-sales parts availability.',
      'A mixed fleet of electric surfboards and beginner-friendly watercraft can support both premium riders and first-time guests.'
    ]
  },
  {
    slug: 'distributor-demo-programs',
    title: 'Distributors Can Use Demo Programs to Explain Premium Water Sports Products',
    excerpt: 'Commercial buyers often need to see operating workflow before committing to electric water sports equipment.',
    paragraphs: [
      'For overseas distributors, product education is becoming as important as product specification.',
      'A strong demo program should show charging, waterproof structure, rider onboarding, safety controls and spare parts support in one clear workflow.',
      'CHEERDMOTO product content can be paired with localized demos for rental operators, resorts and yacht clubs.'
    ]
  },
  {
    slug: 'fleet-after-sales',
    title: 'After-Sales Planning Is Becoming Central to Electric Water Sports Fleet Buying',
    excerpt: 'Rental and resort buyers increasingly evaluate service workflow, spare parts and staff training alongside speed and battery data.',
    paragraphs: [
      'Commercial water sports equipment is judged by uptime, not only by top speed or product appearance.',
      'Before placing fleet orders, buyers should define inspection checklists, battery handling, part replacement rules and support contacts.',
      'That operating plan helps teams protect guest experience and keep rental schedules predictable.'
    ]
  },
  {
    slug: 'premium-waterfront-positioning',
    title: 'Premium Waterfront Projects Are Using Water Attractions as Brand Signals',
    excerpt: 'Luxury waterfront projects continue to show why visually strong water sports equipment matters for destination positioning.',
    paragraphs: [
      'Premium waterfront projects use marina visuals, guest activities and social sharing moments to strengthen destination identity.',
      'Water sports products that look distinctive and are easy to explain can support that positioning for resorts and clubs.',
      'The equipment shortlist should balance brand impact with daily operating simplicity.'
    ]
  },
  {
    slug: 'rental-fleet-mix',
    title: 'Rental Fleets Need a Better Mix of Beginner and Premium Water Attractions',
    excerpt: 'Public waterfront trends show demand for water experiences that serve more than one customer skill level.',
    paragraphs: [
      'A single high-performance product is rarely enough for a full commercial rental program.',
      'Operators should plan a mix that includes premium rides, beginner-friendly sessions and visual products that are easy to promote online.',
      'This approach gives sales teams more ways to package water experiences for different guest groups.'
    ]
  }
];

const candidates: Candidate[] = [
  {
    slug: 'auto-red-sea-waterfront-experiences',
    title: 'Red Sea Waterfront Projects Keep Raising the Bar for Guest Water Experiences',
    excerpt: 'Luxury coastal projects continue to show why resorts and marinas need memorable, easy-to-operate water sports attractions.',
    coverImage: '/assets/news/neom-sindalah.webp',
    category: 'Water Sports Destinations',
    content: 'Luxury waterfront development is increasingly built around marinas, visual guest experiences and differentiated leisure activities.\n\nFor water sports buyers, this makes equipment planning part of destination design rather than a simple rental add-on.\n\nElectric surfboards and go-kart boats can support resort demos, yacht club activation and family-friendly attraction programs.',
    publishDate: '',
    author: 'CHEERDMOTO Editorial Team',
    source: 'NEOM Sindalah newsroom: https://www.neom.com/en-us/newsroom/neom-board-of-directors-showcases-opening-of-sindalah',
    tags: ['Middle East', 'Resorts', 'Yacht Clubs'],
    seoTitle: 'Red Sea Waterfront Water Sports Experience Update | CHEERDMOTO',
    seoDescription: 'Source-attributed CHEERDMOTO update on luxury waterfront projects and water sports equipment planning.'
  },
  {
    slug: 'auto-marina-rental-fleet-electrification',
    title: 'Marina Rental Fleets Are Moving Toward Cleaner Electric Water Attractions',
    excerpt: 'Waterfront operators are looking for compact electric equipment that can create short, repeatable and easy-to-supervise guest sessions.',
    coverImage: '/assets/news/shoremaster-waterfront-trends.webp',
    category: 'Resort & Rental Operations',
    content: 'Marina and dock operators are paying more attention to clean, compact and easy-to-manage waterfront recreation.\n\nFor rental fleets, the buying decision should include charging workflow, rider onboarding, spare parts and daily inspection.\n\nSmall electric watercraft can help operators add paid experiences without the complexity of full-size boat programs.',
    publishDate: '',
    author: 'CHEERDMOTO Editorial Team',
    source: 'ShoreMaster waterfront industry report: https://www.shoremaster.com/blog/articles/state-of-the-waterfront-industry-2026-key-trends-in-docks-lifts-and-marinas/',
    tags: ['Electric Boating', 'Rentals', 'Marinas'],
    seoTitle: 'Electric Marina Rental Fleet Update | CHEERDMOTO',
    seoDescription: 'Source-attributed CHEERDMOTO update on marina rental fleet electrification and buyer planning.'
  },
  {
    slug: 'auto-electric-surfboard-commercial-use',
    title: 'Electric Surfboards Continue to Gain Commercial Resort Relevance',
    excerpt: 'Market commentary points to electric surfboards becoming more relevant for resorts, rental operators and coastal leisure businesses.',
    coverImage: '/assets/news/claritas-electric-surfboard-market.webp',
    category: 'Electric Surfboards',
    content: 'Electric surfboards are increasingly discussed as commercial assets, not only enthusiast products.\n\nFor commercial buyers, speed is only one part of the decision. Battery workflow, waterproof structure, training, support and spare parts planning matter just as much.\n\nDistributors can package premium boards with beginner-friendly water attractions to serve more visitor types.',
    publishDate: '',
    author: 'CHEERDMOTO Editorial Team',
    source: 'Claritas Intelligence electric surfboard market release: https://claritasintelligence.com/press-release/global-electric-surfboard-market',
    tags: ['Electric Surfboards', 'Commercial Rentals', 'Product Selection'],
    seoTitle: 'Electric Surfboard Commercial Resort Update | CHEERDMOTO',
    seoDescription: 'Source-attributed CHEERDMOTO update on commercial electric surfboard use for resorts and rentals.'
  }
];

function slotDate(base: Date, offset: number) {
  const date = new Date(base);
  date.setUTCHours(Math.floor(date.getUTCHours() / 3) * 3, 0, 0, 0);
  date.setUTCHours(date.getUTCHours() + offset * 3);
  return date;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isTodayPost(post: ContentPost, date = new Date()) {
  return post.type === 'news' && post.status === 'published' && post.publishDate === todayKey(date);
}

function sourceUrl(candidate: Pick<Candidate, 'source'>) {
  return candidate.source.match(/https?:\/\/\S+/)?.[0]?.replace(/[),.;]+$/, '') || '';
}

function sourceDomain(candidate: Pick<Candidate, 'source'>) {
  try {
    return new URL(sourceUrl(candidate)).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return candidate.source.split(':')[0]?.trim().toLowerCase() || '';
  }
}

function rollingCandidate(base: Date, offset: number, usedImages: Set<string>, usedDomains = new Set<string>()): Candidate | null {
  const slot = slotDate(base, offset);
  const slotId = slot.toISOString().slice(0, 13).replace(/[-T:]/g, '');
  const angle = rollingAngles[offset % rollingAngles.length];
  const rotatedSources = [...sourceBriefs.slice(offset % sourceBriefs.length), ...sourceBriefs.slice(0, offset % sourceBriefs.length)];
  const source = rotatedSources.find((item) => !usedDomains.has(new URL(item.url).hostname.replace(/^www\./, '').toLowerCase())) || rotatedSources[0];
  const coverImage = source.images.find((image) => !usedImages.has(image));
  if (!coverImage) return null;
  const title = `${angle.title} for ${source.category}`;
  const sourceLine = `${source.name}: ${source.url}`;
  return {
    slug: `auto-${slotId}-${source.key}-${angle.slug}`,
    title,
    excerpt: angle.excerpt,
    coverImage,
    category: source.category,
    content: `${angle.paragraphs.join('\n\n')}\n\nSource note: this automated article uses public material from ${source.name} for market context and image attribution.`,
    publishDate: '',
    author: 'CHEERDMOTO Editorial Team',
    source: sourceLine,
    tags: source.tags,
    seoTitle: `${title} | CHEERDMOTO`,
    seoDescription: angle.excerpt
  };
}

function canonical(value: string) {
  return value
    .toLowerCase()
    .replace(/\(\d{4}-\d{2}-\d{2}\)/g, '')
    .replace(/\s+for\s+(water sports destinations|resort and rental operations|electric surfboards)$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function topicKey(candidate: Pick<Candidate, 'title' | 'excerpt' | 'content'>) {
  return `${canonical(candidate.title)}|${canonical(candidate.excerpt)}|${canonical(candidate.content).slice(0, 120)}`;
}

function nextCandidate(publishedSlugs: Set<string>, publishedTopics: Set<string>, usedImages: Set<string>) {
  const staticCandidate = candidates.find((item) => !publishedSlugs.has(item.slug) && !publishedTopics.has(topicKey(item)) && !usedImages.has(item.coverImage));
  if (staticCandidate) return staticCandidate;
  const now = new Date();
  for (let offset = 0; offset < 240; offset += 1) {
    const candidate = rollingCandidate(now, offset, usedImages);
    if (!candidate) continue;
    const key = topicKey(candidate);
    if (!publishedSlugs.has(candidate.slug) && !publishedTopics.has(key)) return candidate;
  }
  return null;
}

function fallbackDailyCandidate(posts: ContentPost[], batchCandidates: Candidate[] = []): Candidate | null {
  const now = new Date();
  const day = todayKey(now);
  const todayPosts = posts.filter((post) => isTodayPost(post, now));
  if (todayPosts.length + batchCandidates.length >= DAILY_MAX_NEWS) return null;
  const publishedSlugs = new Set(posts.map((post) => post.slug));
  const publishedTopics = new Set(posts.map((post) => topicKey(post)));
  const usedTodayImages = new Set([
    ...todayPosts.map((post) => post.coverImage),
    ...batchCandidates.map((candidate) => candidate.coverImage)
  ]);
  const usedTodayDomains = new Set([
    ...todayPosts.map((post) => sourceDomain(post)),
    ...batchCandidates.map((candidate) => sourceDomain(candidate))
  ]);
  const baseOffset = todayPosts.length + batchCandidates.length;

  for (let offset = baseOffset; offset < baseOffset + 120; offset += 1) {
    const candidate = rollingCandidate(now, offset, usedTodayImages, usedTodayDomains);
    if (!candidate) continue;
    const sequence = todayPosts.length + batchCandidates.length + 1;
    const dailyCandidate = {
      ...candidate,
      slug: `${candidate.slug}-${day.replace(/-/g, '')}-${sequence}`,
      title: `${candidate.title} - ${day} Buyer Brief ${sequence}`,
      excerpt: `${candidate.excerpt} Daily SEO/GEO buyer brief for ${day}, source ${sequence}.`,
      seoTitle: `${candidate.title} | ${day} Water Sports SEO GEO Buyer Brief`,
      seoDescription: `${candidate.excerpt} Includes source attribution, regional buyer context and CHEERDMOTO GEO-friendly commercial analysis.`.slice(0, 155),
      content: `${candidate.content}\n\nSEO and GEO note: this ${day} buyer brief is structured around a distinct source, buyer intent, regional context, product category and source attribution so it can support independent search indexing and answer-engine citation.`
    };
    const key = topicKey(dailyCandidate);
    if (publishedSlugs.has(dailyCandidate.slug) || publishedTopics.has(key)) continue;
    usedTodayImages.add(dailyCandidate.coverImage);
    usedTodayDomains.add(sourceDomain(dailyCandidate));
    return dailyCandidate;
  }
  return null;
}

const repairImagePool = [
  '/assets/news/neom-sindalah.webp',
  '/assets/news/neom-sindalah-marina-detail.jpg',
  '/assets/news/shoremaster-waterfront-trends.webp',
  '/assets/news/shoremaster-vertical-lift-sunset.jpg',
  '/assets/news/shoremaster-dock-bench.jpg',
  '/assets/news/shoremaster-dock-ipe.jpg',
  '/assets/news/claritas-electric-surfboard-market.webp'
];

function replacementImage(used: Set<string>, fallbackIndex = 0, allowReuse = false) {
  return repairImagePool.find((image) => !used.has(image)) || (allowReuse ? repairImagePool[fallbackIndex % repairImagePool.length] : undefined);
}

function isOwnSiteNewsImage(image: string) {
  return /\/assets\/(catalog|banners)\//i.test(image);
}

export async function repairNewsImageDiversity() {
  const now = new Date().toISOString();
  let changed = 0;
  const store = await writeAdminStore((current) => {
    const used = new Set<string>();
    const posts = current.posts.map((post, index) => {
      if (post.type !== 'news' || post.status !== 'published') return post;
      if (!isOwnSiteNewsImage(post.coverImage) && !used.has(post.coverImage)) {
        used.add(post.coverImage);
        return post;
      }
      const coverImage = replacementImage(used, index, isOwnSiteNewsImage(post.coverImage));
      if (!coverImage) return post;
      used.add(coverImage);
      changed += 1;
      return {...post, coverImage, updatedAt: now};
    });
    return changed ? {...current, posts} : current;
  });
  const newsImages = store.posts.filter((post) => post.type === 'news' && post.status === 'published').map((post) => post.coverImage);
  return {changed, images: newsImages};
}

async function validateImage(url: string) {
  if (url.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', url);
    const bytes = await fs.readFile(filePath);
    if (!bytes.length) throw new Error(`Image is empty: ${url}`);
    return {absolute: `${siteUrl}${url}`, type: 'local/public', size: bytes.length};
  }
  const absolute = url.startsWith('http') ? url : `${siteUrl}${url}`;
  const response = await fetch(absolute, {method: 'GET', cache: 'no-store'});
  if (!response.ok) throw new Error(`Image failed ${response.status}: ${absolute}`);
  const type = response.headers.get('content-type') || '';
  if (!/^image\/(avif|webp|png|jpe?g)/i.test(type)) throw new Error(`Invalid image content-type ${type}: ${absolute}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const signature = Array.from(bytes.slice(0, 12)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const valid = signature.startsWith('ffd8ff') || signature.startsWith('89504e47') || signature.includes('57454250') || signature.startsWith('000000') && signature.includes('6674797061766966');
  if (!valid) throw new Error(`Invalid image signature ${signature}: ${absolute}`);
  return {absolute, type, size: bytes.length};
}

async function validateNewsCover(candidate: Candidate, store: Awaited<ReturnType<typeof readAdminStore>>) {
  try {
    const image = await validateImage(candidate.coverImage);
    return {coverImage: candidate.coverImage, image};
  } catch (error) {
    const used = new Set(store.posts.filter((post) => post.type === 'news' && post.status === 'published').map((post) => post.coverImage));
    const fallback = replacementImage(used);
    if (!candidate.coverImage.startsWith('http') || !fallback) throw error;
    const image = await validateImage(fallback);
    return {coverImage: fallback, image};
  }
}

export async function publishNextAutomatedNews() {
  const store = await readAdminStore();
  const {candidate, diagnostics} = await selectNextAutomatedNews(store.posts);
  if (!candidate) {
    return {published: false, reason: diagnostics.reason || 'No qualified non-duplicate news candidate was found.', diagnostics};
  }

  const {coverImage, image} = await validateNewsCover(candidate, store);
  const now = new Date().toISOString();
  const publishDate = now.slice(0, 10);
  const post: ContentPost = {
    ...candidate,
    coverImage,
    id: `post-${candidate.slug}`,
    type: 'news',
    publishDate,
    status: 'published',
    createdAt: now,
    updatedAt: now
  };

  await writeAdminStore((current) => ({
    ...current,
    posts: [post, ...current.posts.filter((item) => item.slug !== post.slug)]
  }));

  await recordPublishedAutomatedNews(candidate);

  return {published: true, slug: post.slug, title: post.title, image, diagnostics};
}

async function publishCandidate(candidate: Candidate, diagnostics: Record<string, unknown>) {
  const store = await readAdminStore();
  const {coverImage, image} = await validateNewsCover(candidate, store);
  const now = new Date().toISOString();
  const publishDate = todayKey();
  const post: ContentPost = {
    ...candidate,
    coverImage,
    id: `post-${candidate.slug}`,
    type: 'news',
    publishDate,
    status: 'published',
    createdAt: now,
    updatedAt: now
  };

  await writeAdminStore((current) => ({
    ...current,
    posts: [post, ...current.posts.filter((item) => item.slug !== post.slug)]
  }));

  return {published: true, slug: post.slug, title: post.title, image, diagnostics};
}

export async function publishDailyAutomatedNews(target = DAILY_MIN_NEWS) {
  const parsedTarget = Number.isFinite(Number(target)) ? Number(target) : DAILY_MIN_NEWS;
  const requestedTarget = Math.max(0, Math.min(DAILY_MAX_NEWS, parsedTarget));
  const initialStore = await readAdminStore();
  const alreadyPublishedToday = initialStore.posts.filter((post) => isTodayPost(post)).length;
  const remainingTarget = Math.max(0, requestedTarget - alreadyPublishedToday);
  const results = [];
  let publishedCount = 0;
  const fallbackBatch: Candidate[] = [];

  for (let index = 0; index < remainingTarget; index += 1) {
    const result = await publishNextAutomatedNews();
    if (result.published) {
      results.push(result);
      publishedCount += 1;
      continue;
    }

    const latestStore = await readAdminStore();
    const fallback = fallbackDailyCandidate(latestStore.posts, fallbackBatch);
    if (!fallback) {
      results.push(result);
      break;
    }
    const fallbackResult = await publishCandidate(fallback, {
      mode: 'seo_geo_fallback',
      reason: result.reason || 'Dynamic candidate unavailable; source-attributed fallback used to satisfy the daily minimum.',
      previousDiagnostics: result.diagnostics || null
    });
    fallbackBatch.push(fallback);
    results.push(fallbackResult);
    publishedCount += 1;
  }

  return {
    mode: 'daily_batch',
    target: requestedTarget,
    alreadyPublishedToday,
    publishedCount,
    totalPublishedToday: alreadyPublishedToday + publishedCount,
    results,
    completed: alreadyPublishedToday + publishedCount >= requestedTarget
  };
}

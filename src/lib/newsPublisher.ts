import {readAdminStore, writeAdminStore, type ContentPost} from '@/lib/backendStore';

type Candidate = Omit<ContentPost, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'status'>;
const DAILY_MIN_NEWS = 3;
const DAILY_MAX_NEWS = 4;
const candidates: Candidate[] = [
  {slug: 'auto-electric-dirt-bike-demand', title: 'Electric Dirt Bike Buyers Are Comparing Complete Riding Systems', excerpt: 'CHEERDMOTO buyers are evaluating motor output, battery range, suspension, brakes and after-sales support together.', coverImage: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png', category: 'Electric Dirt Bikes', content: 'Electric dirt bike buying is moving beyond headline speed. Riders and dealers need a complete view of power, range, suspension, braking, parts and support.\n\nCHEERDMOTO positions XCEED as the balanced trail platform and XTREME as the high-output flagship.', publishDate: '', author: 'CHEERDMOTO Editorial Team', source: 'CHEERDMOTO product catalog: https://cheerdmotos.com/products', tags: ['Electric Dirt Bike', 'Dealer', 'Support'], seoTitle: 'Electric Dirt Bike Buyer Systems | CHEERDMOTO', seoDescription: 'CHEERDMOTO update on electric dirt bike buyer priorities.'},
  {slug: 'auto-fat-tire-ebike-utility', title: 'Fat Tire E-Bike Buyers Want Utility, Comfort and Simple Model Choice', excerpt: 'Xcite, Xplore and Xplus serve different rider workflows across access, utility and comfort.', coverImage: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xplus_transparent.png', category: 'E Bikes', content: 'Fat tire e-bike buyers should choose by frame access, storage, terrain, daily trip length and comfort expectations.\n\nCHEERDMOTO keeps the model lineup simple: Xcite for low-step access, Xplore for utility and Xplus for full-suspension comfort.', publishDate: '', author: 'CHEERDMOTO Editorial Team', source: 'CHEERDMOTO e-bike catalog: https://cheerdmotos.com/e-bikes', tags: ['E Bike', 'Fat Tire', 'Utility'], seoTitle: 'Fat Tire E-Bike Utility Update | CHEERDMOTO', seoDescription: 'CHEERDMOTO update on fat tire e-bike model selection.'},
  {slug: 'auto-smart-mobility-support', title: 'Smart Mobility Buyers Need Support Planning Before Purchase', excerpt: 'Comfort, control, folding, charging and service support shape long-term Smart B02 satisfaction.', coverImage: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/smart_b02_transparent.png', category: 'Electric Wheelchairs', content: 'Smart mobility buyers should evaluate daily movement, turning control, folding workflow and service access before purchase.\n\nCHEERDMOTO Smart B02 is positioned for practical electric mobility and everyday independence.', publishDate: '', author: 'CHEERDMOTO Editorial Team', source: 'CHEERDMOTO mobility catalog: https://cheerdmotos.com/electric-wheelchairs', tags: ['Electric Wheelchair', 'Smart B02', 'Mobility'], seoTitle: 'Smart Mobility Support Update | CHEERDMOTO', seoDescription: 'CHEERDMOTO update on Smart B02 buyer planning.'}
];
function todayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
function isTodayPost(post: ContentPost, date = new Date()) { return post.type === 'news' && post.status === 'published' && post.publishDate === todayKey(date); }
function nextCandidate(posts: ContentPost[], offset = 0): Candidate | null {
  const used = new Set(posts.map((post) => post.slug));
  const day = todayKey().replace(/-/g, '');
  for (let i = 0; i < candidates.length * 20; i += 1) {
    const base = candidates[(i + offset) % candidates.length];
    const slug = `${base.slug}-${day}-${i + 1}`;
    if (used.has(slug)) continue;
    return {...base, slug, title: `${base.title} - ${todayKey()} Brief ${i + 1}`};
  }
  return null;
}
export async function repairNewsImageDiversity() { return {changed: 0, images: candidates.map((item) => item.coverImage)}; }
async function publishCandidate(candidate: Candidate) {
  const now = new Date().toISOString();
  const post: ContentPost = {...candidate, id: `post-${candidate.slug}`, type: 'news', publishDate: todayKey(), status: 'published', createdAt: now, updatedAt: now};
  await writeAdminStore((current) => ({...current, posts: [post, ...current.posts.filter((item) => item.slug !== post.slug)]}));
  return {published: true, slug: post.slug, title: post.title, image: {absolute: post.coverImage, type: 'local/public'}, diagnostics: {mode: 'cheerdmoto_static_news'}};
}
export async function publishNextAutomatedNews() {
  const store = await readAdminStore();
  const candidate = nextCandidate(store.posts);
  if (!candidate) return {published: false, reason: 'No CHEERDMOTO news candidate was available.', diagnostics: {mode: 'cheerdmoto_static_news'}};
  return publishCandidate(candidate);
}
export async function publishDailyAutomatedNews(target = DAILY_MIN_NEWS) {
  const requestedTarget = Math.max(0, Math.min(DAILY_MAX_NEWS, Number.isFinite(Number(target)) ? Number(target) : DAILY_MIN_NEWS));
  const initialStore = await readAdminStore();
  const alreadyPublishedToday = initialStore.posts.filter((post) => isTodayPost(post)).length;
  const remainingTarget = Math.max(0, requestedTarget - alreadyPublishedToday);
  const results = [];
  let publishedCount = 0;
  for (let index = 0; index < remainingTarget; index += 1) {
    const latestStore = await readAdminStore();
    const candidate = nextCandidate(latestStore.posts, index);
    if (!candidate) break;
    const result = await publishCandidate(candidate);
    results.push(result);
    publishedCount += 1;
  }
  return {mode: 'daily_batch', target: requestedTarget, alreadyPublishedToday, publishedCount, totalPublishedToday: alreadyPublishedToday + publishedCount, results, completed: alreadyPublishedToday + publishedCount >= requestedTarget};
}

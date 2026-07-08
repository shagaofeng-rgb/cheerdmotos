import {readAdminStore, writeAdminStore, type ContentPost} from '@/lib/backendStore';
import {appendNewsJobLog} from '@/lib/newsAutomationStore';

const DAILY_BLOG_TARGET = 1;
const blogImages = [
  '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png',
  '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xtreme_transparent.png',
  '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xplus_transparent.png',
  '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/smart_b02_transparent.png'
];
const blogTopics = [
  {slug: 'electric-dirt-bike-checklist', title: 'Electric Dirt Bike Buying Checklist', excerpt: 'Compare power, range, suspension, brakes and support before choosing an electric dirt bike.', category: 'Buying Guide', tags: ['Electric Dirt Bike', 'XCEED', 'XTREME'], source: 'CHEERDMOTO product catalog: https://cheerdmotos.com/products', paragraphs: ['Buyers should compare riding workflow, not only top speed.', 'Battery range, controller tuning, suspension quality and braking hardware shape the actual experience.', 'Dealer and service support should be part of the purchase decision.'], productSlugs: ['xceed-electric-dirt-bike', 'cheerdmoto-performance-96v-electric-dirtbike-xtreme']},
  {slug: 'fat-tire-ebike-selection', title: 'How to Choose a Fat Tire E-Bike', excerpt: 'A model guide for Xcite, Xplore and Xplus buyers.', category: 'E Bike Guide', tags: ['E Bike', 'Fat Tire', 'Commuter'], source: 'CHEERDMOTO e-bike catalog: https://cheerdmotos.com/e-bikes', paragraphs: ['Xcite suits easy access, Xplore suits utility, and Xplus suits comfort-focused mixed-surface riding.', 'Riders should consider frame style, storage, trip distance, terrain and support needs.'], productSlugs: ['grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto', 'grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto', 'grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike']},
  {slug: 'mobility-support-planning', title: 'Smart Mobility Support Planning', excerpt: 'What Smart B02 buyers should review before purchase.', category: 'Mobility Guide', tags: ['Electric Wheelchair', 'Smart B02', 'Support'], source: 'CHEERDMOTO mobility catalog: https://cheerdmotos.com/electric-wheelchairs', paragraphs: ['Mobility buyers should evaluate comfort, turning control, folding workflow, charging and service.', 'Support readiness is as important as headline specs for daily independence.'], productSlugs: ['cheerdmoto-electric-wheelchair-smart-b02']}
];

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isTodayBlog(post: ContentPost, date = new Date()) {
  return post.type === 'blog' && post.status === 'published' && post.publishDate === todayKey(date);
}

function candidateFor(posts: ContentPost[]) {
  const publishedSlugs = new Set(posts.map((post) => post.slug));
  const dateKey = todayKey().replace(/-/g, '');
  for (let offset = 0; offset < blogTopics.length * 20; offset += 1) {
    const topic = blogTopics[offset % blogTopics.length];
    const slug = `auto-blog-${dateKey}-${offset + 1}-${topic.slug}`;
    if (publishedSlugs.has(slug)) continue;
    return {
      slug,
      title: `${topic.title} (${todayKey()} Edition)`,
      excerpt: topic.excerpt,
      coverImage: blogImages[offset % blogImages.length],
      category: topic.category,
      content: topic.paragraphs.join('\n\n'),
      publishDate: '',
      author: 'CHEERDMOTO Editorial Team',
      source: topic.source,
      tags: topic.tags,
      seoTitle: `${topic.title} | CHEERDMOTO`,
      seoDescription: topic.excerpt.slice(0, 155),
      productSlugs: topic.productSlugs
    };
  }
  return null;
}

export async function publishDailyAutomatedBlog(target = DAILY_BLOG_TARGET) {
  const requestedTarget = Math.max(0, Math.min(3, Number.isFinite(Number(target)) ? Number(target) : DAILY_BLOG_TARGET));
  const initialStore = await readAdminStore();
  const alreadyPublishedToday = initialStore.posts.filter((post) => isTodayBlog(post)).length;
  const remainingTarget = Math.max(0, requestedTarget - alreadyPublishedToday);
  const results = [];
  let publishedCount = 0;
  for (let index = 0; index < remainingTarget; index += 1) {
    const latestStore = await readAdminStore();
    const candidate = candidateFor(latestStore.posts);
    if (!candidate) {
      results.push({published: false, reason: 'No non-duplicate blog candidate was available.'});
      break;
    }
    const now = new Date().toISOString();
    const post: ContentPost = {
      ...candidate,
      id: `post-${candidate.slug}`,
      type: 'blog',
      publishDate: todayKey(),
      status: 'published',
      geoSummary: `${candidate.title} connects CHEERDMOTO product guidance with practical buyer workflows and related product pages.`,
      imageAlt: `${candidate.title} CHEERDMOTO guide image`,
      imageSourceUrl: 'https://cheerdmotos.com',
      imageCredit: 'CHEERDMOTO owned product image',
      createdAt: now,
      updatedAt: now
    };
    await writeAdminStore((current) => ({...current, posts: [post, ...current.posts.filter((item) => item.slug !== post.slug)]}));
    results.push({published: true, slug: post.slug, title: post.title, image: {absolute: post.coverImage, type: 'local/public'}});
    publishedCount += 1;
  }
  const totalPublishedToday = alreadyPublishedToday + publishedCount;
  await appendNewsJobLog({
    type: 'blog',
    target: requestedTarget,
    alreadyPublishedToday,
    publishedCount,
    status: totalPublishedToday >= requestedTarget ? 'completed' : 'partial',
    message: totalPublishedToday >= requestedTarget ? 'Daily blog target satisfied.' : 'Daily blog target not satisfied; next run will retry.'
  });
  return {mode: 'daily_blog_batch', target: requestedTarget, alreadyPublishedToday, publishedCount, totalPublishedToday, completed: totalPublishedToday >= requestedTarget, results};
}

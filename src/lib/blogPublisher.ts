import fs from 'node:fs/promises';
import path from 'node:path';
import {readAdminStore, writeAdminStore, type ContentPost} from '@/lib/backendStore';
import {siteUrl} from '@/lib/site';

type BlogCandidate = Omit<ContentPost, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'status'>;

const DAILY_BLOG_TARGET = 1;

const blogImages = [
  '/assets/news/shoremaster-waterfront-trends.webp',
  '/assets/news/neom-sindalah-marina-detail.jpg',
  '/assets/news/claritas-electric-surfboard-market.webp',
  '/assets/news/shoremaster-vertical-lift-sunset.jpg'
];

const blogTopics = [
  {
    slug: 'commercial-electric-surfboard-buying-checklist',
    title: 'Commercial Electric Surfboard Buying Checklist for Resorts and Rentals',
    excerpt: 'A practical guide for comparing speed, battery workflow, waterproof design, training and after-sales support before buying electric surfboards.',
    category: 'Buying Guide',
    tags: ['Electric Surfboards', 'Resorts', 'Rental Fleet'],
    source: 'CHEERDMOTO product planning guide: https://cheerdmotos.com/en/products',
    paragraphs: [
      'Commercial buyers should compare electric surfboards by daily operating workflow, not only by top speed.',
      'The purchase checklist should include charging capacity, waterproof structure, spare battery planning, rider briefing time, staff training and replacement parts.',
      'For resorts and rental fleets, X1 can support broader commercial use while X1 Pro is better positioned for premium demos and advanced riders.'
    ]
  },
  {
    slug: 'go-kart-boat-rental-program-planning',
    title: 'How to Plan a Go-Kart Boat Rental Program for Water Parks and Scenic Areas',
    excerpt: 'A B2B guide for building beginner-friendly water attractions with clear session design, safety routines and fleet planning.',
    category: 'Rental Operations',
    tags: ['Go-Kart Boats', 'Water Parks', 'Operations'],
    source: 'CHEERDMOTO XCEED product guide: https://cheerdmotos.com/products/xceed-electric-dirt-bike',
    paragraphs: [
      'A go-kart boat program works best when the route, ride duration, staff supervision and queue process are planned before purchase.',
      'Operators should evaluate product stability, battery rotation, protective gear, daily inspection and simple guest instructions.',
      'Rage Shark X is positioned for scenic areas, water parks and rental operators that need an easier entry point than high-speed boards.'
    ]
  },
  {
    slug: 'fuel-vs-electric-surfboard-commercial-selection',
    title: 'Fuel vs Electric Surfboards: Commercial Selection Guide for Distributors',
    excerpt: 'A product-positioning guide for distributors comparing electric surfboards with fuel-powered surfboards for different buyer types.',
    category: 'Product Comparison',
    tags: ['Fuel Surfboards', 'Electric Surfboards', 'Distributors'],
    source: 'CHEERDMOTO product catalog: https://cheerdmotos.com/en/products',
    paragraphs: [
      'Electric and fuel-powered surfboards serve different commercial conversations.',
      'Electric boards are easier to position for clean resort experiences and shorter training workflows, while fuel-powered boards can support longer outdoor adventure programs.',
      'Distributors should build catalog bundles around buyer type: resorts, rental fleets, outdoor bases and premium rider communities.'
    ]
  }
];

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isTodayBlog(post: ContentPost, date = new Date()) {
  return post.type === 'blog' && post.status === 'published' && post.publishDate === todayKey(date);
}

async function validateImage(url: string) {
  if (url.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', url);
    const bytes = await fs.readFile(filePath);
    if (!bytes.length) throw new Error(`Blog image is empty: ${url}`);
    return {absolute: `${siteUrl}${url}`, type: 'local/public'};
  }
  const absolute = url.startsWith('http') ? url : `${siteUrl}${url}`;
  const response = await fetch(absolute, {method: 'GET', cache: 'no-store'});
  if (!response.ok) throw new Error(`Blog image failed ${response.status}: ${absolute}`);
  const type = response.headers.get('content-type') || '';
  if (!/^image\/(avif|webp|png|jpe?g)/i.test(type)) throw new Error(`Invalid blog image type ${type}: ${absolute}`);
  return {absolute, type};
}

function candidateFor(posts: ContentPost[]): BlogCandidate | null {
  const publishedSlugs = new Set(posts.map((post) => post.slug));
  const usedImages = new Set(posts.filter((post) => post.type === 'blog').map((post) => post.coverImage));
  const dateKey = todayKey().replace(/-/g, '');
  for (let offset = 0; offset < blogTopics.length * 20; offset += 1) {
    const topic = blogTopics[offset % blogTopics.length];
    const image = blogImages.find((item) => !usedImages.has(item)) || blogImages[offset % blogImages.length];
    const slug = `auto-blog-${dateKey}-${offset + 1}-${topic.slug}`;
    if (publishedSlugs.has(slug)) continue;
    return {
      slug,
      title: `${topic.title} (${todayKey()} Edition)`,
      excerpt: topic.excerpt,
      coverImage: image,
      category: topic.category,
      content: `${topic.paragraphs.join('\n\n')}\n\nSEO/GEO note: this guide is structured for commercial buyer questions, product comparison and answer-engine citation. It links decisions back to real CHEERDMOTO product categories without inventing specifications.`,
      publishDate: '',
      author: 'CHEERDMOTO Editorial Team',
      source: topic.source,
      tags: topic.tags,
      seoTitle: `${topic.title} | CHEERDMOTO Buying Guide`,
      seoDescription: topic.excerpt.slice(0, 155)
    };
  }
  return null;
}

export async function publishDailyAutomatedBlog(target = DAILY_BLOG_TARGET) {
  const parsedTarget = Number.isFinite(Number(target)) ? Number(target) : DAILY_BLOG_TARGET;
  const requestedTarget = Math.max(0, Math.min(3, parsedTarget));
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
    const image = await validateImage(candidate.coverImage);
    const now = new Date().toISOString();
    const post: ContentPost = {
      ...candidate,
      id: `post-${candidate.slug}`,
      type: 'blog',
      publishDate: todayKey(),
      status: 'published',
      createdAt: now,
      updatedAt: now
    };
    await writeAdminStore((current) => ({
      ...current,
      posts: [post, ...current.posts.filter((item) => item.slug !== post.slug)]
    }));
    results.push({published: true, slug: post.slug, title: post.title, image});
    publishedCount += 1;
  }

  return {
    mode: 'daily_blog_batch',
    target: requestedTarget,
    alreadyPublishedToday,
    publishedCount,
    totalPublishedToday: alreadyPublishedToday + publishedCount,
    completed: alreadyPublishedToday + publishedCount >= requestedTarget,
    results
  };
}

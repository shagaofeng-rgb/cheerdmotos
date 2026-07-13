export type NewsArticle = {
  slug: string;
  date: string;
  updatedAt: string;
  title: string;
  excerpt: string;
  hero: string;
  heroAlt: string;
  imageCredit: {publisher: string; sourceUrl: string; imageUrl: string; note: string; accessedDate: string};
  tags: string[];
  category: string;
  readTime: string;
  sources: {name: string; title: string; url: string; publishedDate: string; accessedDate: string; note: string}[];
  keyTakeaways: string[];
  body: {heading: string; paragraphs: string[]}[];
  productFit: string;
  productSlugs?: string[];
  geoSummary?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourcePublishedAt?: string;
  originalTitle?: string;
  sourceFetchedAt?: string;
};

const siteSource = 'https://www.cheerdmotos.com';

export const newsArticles: NewsArticle[] = [
  {
    slug: 'electric-dirt-bike-buyer-workflow',
    date: '2026-07-07',
    updatedAt: '2026-07-07',
    title: 'How Buyers Should Compare Electric Dirt Bikes Beyond Top Speed',
    excerpt: 'A CHEERDMOTO guide to comparing motor output, battery range, suspension, braking, support and real riding workflow.',
    hero: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png',
    heroAlt: 'CHEERDMOTO XCEED electric dirt bike',
    imageCredit: {publisher: 'CHEERDMOTO', sourceUrl: siteSource, imageUrl: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png', note: 'CHEERDMOTO product image.', accessedDate: '2026-07-07'},
    tags: ['Electric Dirt Bike', 'XCEED', 'Buying Guide'],
    category: 'Electric Dirt Bikes',
    readTime: '4 min read',
    sources: [{name: 'CHEERDMOTO', title: 'CHEERDMOTO Product Catalog', url: siteSource, publishedDate: '2026', accessedDate: '2026-07-07', note: 'Used for CHEERDMOTO product positioning.'}],
    keyTakeaways: ['Compare complete riding workflow, not only top speed.', 'Battery, suspension and brakes shape real trail confidence.', 'Dealer and after-sales support matter for repeat buyers.'],
    body: [
      {heading: 'What buyers should compare', paragraphs: ['Electric dirt bike buyers should compare peak output, controller tuning, battery range, suspension travel, braking hardware and parts support together.', 'A balanced model can be easier to ride and maintain than a bike selected only by headline speed.']},
      {heading: 'CHEERDMOTO product angle', paragraphs: ['XCEED is positioned as the balanced 72V platform for trail and enduro-style riding.', 'XTREME is the higher-output 96V flagship for riders who want maximum power and range.']}
    ],
    productFit: 'Best matched with XCEED and XTREME electric dirt bikes.'
  },
  {
    slug: 'fat-tire-ebike-city-trail-selection',
    date: '2026-07-07',
    updatedAt: '2026-07-07',
    title: 'Choosing a Fat Tire E-Bike for City Range and Trail Attitude',
    excerpt: 'A simple model-selection guide for Xcite, Xplore and Xplus riders.',
    hero: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xplus_transparent.png',
    heroAlt: 'CHEERDMOTO XPLUS fat tire e-bike',
    imageCredit: {publisher: 'CHEERDMOTO', sourceUrl: siteSource, imageUrl: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xplus_transparent.png', note: 'CHEERDMOTO product image.', accessedDate: '2026-07-07'},
    tags: ['E Bike', 'Fat Tire', 'City Mobility'],
    category: 'E Bikes',
    readTime: '4 min read',
    sources: [{name: 'CHEERDMOTO', title: 'CHEERDMOTO E-Bike Catalog', url: siteSource, publishedDate: '2026', accessedDate: '2026-07-07', note: 'Used for product model positioning.'}],
    keyTakeaways: ['Step-through frames help daily access.', 'Over-frame utility suits heavier everyday use.', 'Full suspension improves comfort on mixed surfaces.'],
    body: [
      {heading: 'Frame choice', paragraphs: ['Xcite suits riders who want easy step-through access.', 'Xplore is a practical over-frame utility option, while Xplus focuses on full-suspension comfort.']},
      {heading: 'Use case', paragraphs: ['A good e-bike choice should match storage space, rider size, daily trip distance, terrain and service expectations.']}
    ],
    productFit: 'Best matched with Xcite, Xplore and Xplus fat tire e-bikes.'
  },
  {
    slug: 'smart-mobility-support-planning',
    date: '2026-07-07',
    updatedAt: '2026-07-07',
    title: 'Smart Mobility Buyers Need Comfort, Folding, Control and Support',
    excerpt: 'How to evaluate compact electric wheelchair mobility for daily independence and travel.',
    hero: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/smart_b02_transparent.png',
    heroAlt: 'CHEERDMOTO Smart B02 electric wheelchair',
    imageCredit: {publisher: 'CHEERDMOTO', sourceUrl: siteSource, imageUrl: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/smart_b02_transparent.png', note: 'CHEERDMOTO product image.', accessedDate: '2026-07-07'},
    tags: ['Electric Wheelchair', 'Smart B02', 'Mobility'],
    category: 'Electric Wheelchairs',
    readTime: '3 min read',
    sources: [{name: 'CHEERDMOTO', title: 'CHEERDMOTO Smart Mobility Catalog', url: siteSource, publishedDate: '2026', accessedDate: '2026-07-07', note: 'Used for Smart B02 product positioning.'}],
    keyTakeaways: ['Comfort and control matter as much as range.', 'Folding design helps transport and storage.', 'Support and parts planning protect long-term use.'],
    body: [
      {heading: 'Daily mobility workflow', paragraphs: ['Smart mobility buyers should evaluate turning control, seat comfort, folding workflow, charging routine and service access before purchase.', 'A compact mobility product should make daily movement easier, not add complexity.']},
      {heading: 'CHEERDMOTO product angle', paragraphs: ['Smart B02 is positioned around practical folding mobility, dual-motor movement and everyday independence.']}
    ],
    productFit: 'Best matched with Smart B02 electric wheelchair.'
  }
];

export const newsSlugs = newsArticles.map((article) => article.slug);
function slugify(value: string) { return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export const newsCategories = Array.from(new Map(newsArticles.map((article) => [slugify(article.category), article.category]))).map(([slug, name]) => ({slug, name}));
export const newsTags = Array.from(new Map(newsArticles.flatMap((article) => article.tags.map((tag) => [slugify(tag), tag])))).map(([slug, name]) => ({slug, name}));
export function getNewsCategory(slug: string) { const category = newsCategories.find((item) => item.slug === slug); return category ? {...category, articles: newsArticles.filter((article) => slugify(article.category) === slug)} : null; }
export function getNewsTag(slug: string) { const tag = newsTags.find((item) => item.slug === slug); return tag ? {...tag, articles: newsArticles.filter((article) => article.tags.some((value) => slugify(value) === slug))} : null; }
export function getNewsArticle(slug: string) { return newsArticles.find((article) => article.slug === slug); }

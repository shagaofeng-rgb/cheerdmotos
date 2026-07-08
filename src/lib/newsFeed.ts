import {listAdminPosts, type ContentPost} from '@/lib/backendStore';
import {newsArticles, type NewsArticle} from '@/lib/news';
import {siteUrl} from '@/lib/site';

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function topicFingerprint(article: Pick<NewsArticle, 'title' | 'excerpt'>) {
  return `${article.title} ${article.excerpt}`
    .toLowerCase()
    .replace(/\(\d{4}-\d{2}-\d{2}\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sourceUrlFrom(post: ContentPost) {
  return post.source.match(/https?:\/\/\S+/)?.[0]?.replace(/[),.;]+$/, '') || `${siteUrl}/discover/${post.slug}`;
}

const displayImagePool = [
  {url: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png', publisher: 'CHEERDMOTO', sourceUrl: siteUrl, note: 'CHEERDMOTO product image.'},
  {url: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xtreme_transparent.png', publisher: 'CHEERDMOTO', sourceUrl: siteUrl, note: 'CHEERDMOTO product image.'},
  {url: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xplus_transparent.png', publisher: 'CHEERDMOTO', sourceUrl: siteUrl, note: 'CHEERDMOTO product image.'},
  {url: '/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/smart_b02_transparent.png', publisher: 'CHEERDMOTO', sourceUrl: siteUrl, note: 'CHEERDMOTO product image.'}
];

function postToArticle(post: ContentPost): NewsArticle {
  const sourceUrl = sourceUrlFrom(post);
  const sourceName = post.source.split(':')[0]?.trim() || 'Public source';
  const paragraphs = post.content.split(/\n{2,}/).map((item) => item.replace(/^#+\s*/, '').trim()).filter(Boolean);
  return {
    slug: post.slug,
    date: post.publishDate,
    updatedAt: post.updatedAt.slice(0, 10),
    title: post.title,
    excerpt: post.excerpt,
    hero: post.coverImage,
    heroAlt: `${post.title} source-attributed news image`,
    imageCredit: {
      publisher: sourceName,
      sourceUrl,
      imageUrl: post.coverImage.startsWith('http') ? post.coverImage : `${siteUrl}${post.coverImage}`,
      note: 'Feature image was validated before publication and is shown from a stable CHEERDMOTO-hosted copy when available.',
      accessedDate: post.updatedAt.slice(0, 10)
    },
    tags: post.tags,
    category: post.category || 'Industry News',
    readTime: '4 min read',
    sources: [{
      name: sourceName,
      title: post.title,
      url: sourceUrl,
      publishedDate: post.publishDate,
      accessedDate: post.updatedAt.slice(0, 10),
      note: 'Used for source attribution and market context.'
    }],
    keyTakeaways: [
      'CHEERDMOTO product signals support rider, dealer and mobility planning.',
      'Buyers should compare products by rider use case, operating workflow and after-sales support.',
      'CHEERDMOTO keeps image and source attribution visible on every automated news item.'
    ],
    body: [
      {
        heading: 'What happened',
        paragraphs: paragraphs.slice(0, 2).length ? paragraphs.slice(0, 2) : [post.excerpt]
      },
      {
        heading: 'Why it matters for buyers',
        paragraphs: paragraphs.slice(2, 4).length ? paragraphs.slice(2, 4) : [
          'Riders, dealers and fleet buyers need product information that connects specifications with practical ownership planning.'
        ]
      }
    ],
    productFit: 'Relevant to CHEERDMOTO electric dirt bikes, e-bikes, mobility products, riders, dealers and fleets.',
    productSlugs: post.productSlugs || [],
    geoSummary: post.geoSummary,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    sourcePublishedAt: post.sourcePublishedAt
  };
}

function diversifyArticleImages(articles: NewsArticle[]) {
  const used = new Set<string>();
  return articles.map((article) => {
    if (!used.has(article.hero)) {
      used.add(article.hero);
      return article;
    }
    const replacement = displayImagePool.find((image) => !used.has(image.url));
    if (!replacement) return article;
    used.add(replacement.url);
    return {
      ...article,
      hero: replacement.url,
      heroAlt: `${article.title} supporting industry image`,
      imageCredit: {
        publisher: replacement.publisher,
        sourceUrl: replacement.sourceUrl,
        imageUrl: `${siteUrl}${replacement.url}`,
        note: replacement.note,
        accessedDate: article.updatedAt
      }
    };
  });
}

export async function getAllNewsArticles() {
  const adminPosts = await listAdminPosts('news');
  const published = adminPosts
    .filter((post) => post.status === 'published')
    .map(postToArticle);
  const seen = new Set<string>();
  const seenTopics = new Set<string>();
  const articles = [...published, ...newsArticles]
    .filter((article) => {
      if (seen.has(article.slug)) return false;
      const topic = topicFingerprint(article);
      if (seenTopics.has(topic)) return false;
      seen.add(article.slug);
      seenTopics.add(topic);
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  return diversifyArticleImages(articles);
}

export async function getAllNewsSlugs() {
  return (await getAllNewsArticles()).map((article) => article.slug);
}

export async function getNewsArticleBySlug(slug: string) {
  return (await getAllNewsArticles()).find((article) => article.slug === slug);
}

export async function getNewsCategories() {
  return Array.from(new Map((await getAllNewsArticles()).map((article) => [slugify(article.category), article.category])))
    .map(([slug, name]) => ({slug, name}));
}

export async function getNewsTags() {
  return Array.from(new Map((await getAllNewsArticles()).flatMap((article) => article.tags.map((tag) => [slugify(tag), tag]))))
    .map(([slug, name]) => ({slug, name}));
}

export async function getNewsCategory(slug: string) {
  const articles = await getAllNewsArticles();
  const name = articles.find((article) => slugify(article.category) === slug)?.category;
  if (!name) return null;
  return {slug, name, articles: articles.filter((article) => slugify(article.category) === slug)};
}

export async function getNewsTag(slug: string) {
  const articles = await getAllNewsArticles();
  const name = articles.flatMap((article) => article.tags).find((tag) => slugify(tag) === slug);
  if (!name) return null;
  return {slug, name, articles: articles.filter((article) => article.tags.some((tag) => slugify(tag) === slug))};
}

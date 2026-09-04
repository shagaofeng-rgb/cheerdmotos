import {isPostPublic, listAdminPosts, type ContentPost} from '@/lib/backendStore';
import {type NewsArticle} from '@/lib/news';
import {resolveNewsDisplayImage} from '@/lib/newsImage';
import {siteUrl} from '@/lib/site';

function sourceUrlFrom(post: ContentPost) {
  return post.source.match(/https?:\/\/\S+/)?.[0]?.replace(/[),.;]+$/, '') || `${siteUrl}/discover/${post.slug}`;
}

function postToBlogArticle(post: ContentPost): NewsArticle {
  const sourceUrl = sourceUrlFrom(post);
  const sourceName = post.source.split(':')[0]?.trim() || 'COWIN editorial';
  const hero = resolveNewsDisplayImage(post);
  const usesStoredImage = hero === post.coverImage;
  const paragraphs = post.content.split(/\n{2,}/).map((item) => item.replace(/^#+\s*/, '').trim()).filter(Boolean);
  return {
    slug: post.slug,
    date: post.publishDate,
    updatedAt: post.updatedAt.slice(0, 10),
    title: post.title,
    excerpt: post.excerpt,
    hero,
    heroAlt: `${post.title} COWIN buying guide image`,
    imageCredit: {
      publisher: usesStoredImage ? sourceName : 'COWIN',
      sourceUrl,
      imageUrl: hero.startsWith('http') ? hero : `${siteUrl}${hero}`,
      note: usesStoredImage
        ? 'Image was validated before publication and is kept with visible attribution when based on a public source.'
        : 'A COWIN-owned product image replaces an unavailable legacy feature image.',
      accessedDate: post.updatedAt.slice(0, 10)
    },
    tags: post.tags,
    category: post.category || 'Buying Guide',
    readTime: '5 min read',
    sources: [{
      name: sourceName,
      title: post.title,
      url: sourceUrl,
      publishedDate: post.publishDate,
      accessedDate: post.updatedAt.slice(0, 10),
      note: 'Used for product education, buyer context and source attribution.'
    }],
    keyTakeaways: [
      'Commercial buyers should evaluate product fit, operating workflow and support before purchase.',
      'COWIN buying guides connect product details with rider, dealer and mobility use cases.',
      'Each guide links back to real COWIN product lines instead of inventing specifications.'
    ],
    body: [
      {
        heading: 'Buyer context',
        paragraphs: paragraphs.slice(0, 2).length ? paragraphs.slice(0, 2) : [post.excerpt]
      },
      {
        heading: 'How to use this guide',
        paragraphs: paragraphs.slice(2, 5).length ? paragraphs.slice(2, 5) : [
          'Use this guide to compare COWIN products by rider type, daily workflow, service requirements and dealer fit.'
        ]
      }
    ],
    productFit: 'Relevant to COWIN electric dirt bikes, e-bikes, mobility products, riders, dealers and fleets.',
    productSlugs: post.productSlugs || [],
    geoSummary: post.geoSummary,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    sourcePublishedAt: post.sourcePublishedAt
  };
}

export async function getAllBlogArticles() {
  const adminPosts = await listAdminPosts('blog');
  return adminPosts
    .filter((post) => isPostPublic(post))
    .map(postToBlogArticle)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAllBlogSlugs() {
  return (await getAllBlogArticles()).map((article) => article.slug);
}

export async function getBlogArticleBySlug(slug: string) {
  const articles = await getAllBlogArticles();
  const normalizedSlug = slug.startsWith('guide-') ? slug.slice('guide-'.length) : slug;
  return articles.find((article) => article.slug === normalizedSlug);
}

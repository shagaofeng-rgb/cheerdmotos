import {listAdminPosts, type ContentPost} from '@/lib/backendStore';
import {newsArticles, type NewsArticle} from '@/lib/news';
import {siteUrl} from '@/lib/site';

function sourceUrlFrom(post: ContentPost) {
  return post.source.match(/https?:\/\/\S+/)?.[0]?.replace(/[),.;]+$/, '') || `${siteUrl}/discover/${post.slug}`;
}

function postToBlogArticle(post: ContentPost): NewsArticle {
  const sourceUrl = sourceUrlFrom(post);
  const sourceName = post.source.split(':')[0]?.trim() || 'CHEERDMOTO editorial';
  const paragraphs = post.content.split(/\n{2,}/).map((item) => item.replace(/^#+\s*/, '').trim()).filter(Boolean);
  return {
    slug: post.slug,
    date: post.publishDate,
    updatedAt: post.updatedAt.slice(0, 10),
    title: post.title,
    excerpt: post.excerpt,
    hero: post.coverImage,
    heroAlt: `${post.title} CHEERDMOTO buying guide image`,
    imageCredit: {
      publisher: sourceName,
      sourceUrl,
      imageUrl: post.coverImage.startsWith('http') ? post.coverImage : `${siteUrl}${post.coverImage}`,
      note: 'Image was validated before publication and is kept with visible attribution when based on a public source.',
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
      'CHEERDMOTO buying guides connect product details with rider, dealer and mobility use cases.',
      'Each guide links back to real CHEERDMOTO product lines instead of inventing specifications.'
    ],
    body: [
      {
        heading: 'Buyer context',
        paragraphs: paragraphs.slice(0, 2).length ? paragraphs.slice(0, 2) : [post.excerpt]
      },
      {
        heading: 'How to use this guide',
        paragraphs: paragraphs.slice(2, 5).length ? paragraphs.slice(2, 5) : [
          'Use this guide to compare CHEERDMOTO products by rider type, daily workflow, service requirements and dealer fit.'
        ]
      }
    ],
    productFit: 'Relevant to CHEERDMOTO electric dirt bikes, e-bikes, mobility products, riders, dealers and fleets.'
  };
}

export async function getAllBlogArticles() {
  const adminPosts = await listAdminPosts('blog');
  const published = adminPosts.filter((post) => post.status === 'published').map(postToBlogArticle);
  const staticBlogArticles = newsArticles.slice(1).map((article) => ({
    ...article,
    slug: `guide-${article.slug}`,
    category: article.category || 'Buying Guide'
  }));
  const seen = new Set<string>();
  return [...published, ...staticBlogArticles]
    .filter((article) => {
      if (seen.has(article.slug)) return false;
      seen.add(article.slug);
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAllBlogSlugs() {
  return (await getAllBlogArticles()).map((article) => article.slug);
}

export async function getBlogArticleBySlug(slug: string) {
  return (await getAllBlogArticles()).find((article) => article.slug === slug);
}

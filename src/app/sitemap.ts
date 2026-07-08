import type {MetadataRoute} from 'next';
import {getAllBlogArticles} from '@/lib/blogFeed';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteData, siteUrl} from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, blogs] = await Promise.all([getAllNewsArticles(), getAllBlogArticles()]);
  const staticRoutes = siteData.items.map((item) => ({
    url: `${siteUrl}${item.route}`,
    lastModified: item.publishedAt || siteData.generatedAt || new Date().toISOString(),
    changeFrequency: item.kind === 'product' ? 'weekly' as const : 'monthly' as const,
    priority: item.route === '/' ? 1 : item.kind === 'product' ? 0.8 : 0.65
  }));
  const articleRoutes = [
    {url: `${siteUrl}/news`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.8},
    {url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.75},
    {url: `${siteUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.45},
    ...news.map((article) => ({
      url: `${siteUrl}/news/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.72
    })),
    ...blogs.map((article) => ({
      url: `${siteUrl}/blog/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.68
    }))
  ];
  return [...staticRoutes, ...articleRoutes];
}

import type {MetadataRoute} from 'next';
import {siteUrl} from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/pricing-admin/', '/account/']
      }
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/sitemap-products.xml`,
      `${siteUrl}/sitemap-posts.xml`,
      `${siteUrl}/sitemap-categories.xml`,
      `${siteUrl}/sitemap-pages.xml`,
      `${siteUrl}/news-sitemap.xml`,
      `${siteUrl}/image-sitemap.xml`
    ],
    host: siteUrl
  };
}

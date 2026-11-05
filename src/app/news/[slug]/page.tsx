import type {Metadata} from 'next';
import {notFound, permanentRedirect} from 'next/navigation';
import {ArticleDetailView} from '@/components/ArticleViews';
import {getAllNewsSlugs, getNewsArticleBySlug} from '@/lib/newsFeed';
import {siteUrl} from '@/lib/site';
import {readParam, type SearchParams} from '@/lib/storefrontPagination';

type Props = {params: Promise<{slug: string}>; searchParams: Promise<SearchParams>};

const legacyNewsRedirects: Record<string, string> = {
  'fat-tire-ebike-city-trail-selection': '/blog/fat-tire-ebike-city-trail-selection',
  'smart-mobility-support-planning-20260708-3': '/news/smart-mobility-support-planning'
};

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return (await getAllNewsSlugs()).map((slug) => ({slug}));
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params;
  const redirectTarget = legacyNewsRedirects[slug];
  if (redirectTarget) return {robots: {index: false, follow: true}};
  const article = await getNewsArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: {canonical: `${siteUrl}/news/${article.slug}`},
    robots: article.indexing?.indexable === false ? {index: false, follow: true} : {index: true, follow: true},
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.date,
      modifiedTime: article.updatedAt,
      images: [{url: article.hero, alt: article.heroAlt}]
    }
  };
}

export default async function NewsDetailPage({params, searchParams}: Props) {
  const [{slug}, query] = await Promise.all([params, searchParams]);
  const redirectTarget = legacyNewsRedirects[slug];
  if (redirectTarget) permanentRedirect(redirectTarget);
  const article = await getNewsArticleBySlug(slug);
  if (!article) notFound();
  return <ArticleDetailView article={article} basePath="/news" type="news" activeSection={readParam(query.section)} />;
}

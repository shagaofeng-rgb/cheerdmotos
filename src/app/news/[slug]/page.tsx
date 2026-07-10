import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ArticleDetailView} from '@/components/ArticleViews';
import {getAllNewsSlugs, getNewsArticleBySlug} from '@/lib/newsFeed';
import {siteUrl} from '@/lib/site';

type Props = {params: Promise<{slug: string}>};

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return (await getAllNewsSlugs()).map((slug) => ({slug}));
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params;
  const article = await getNewsArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: {canonical: `${siteUrl}/news/${article.slug}`},
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

export default async function NewsDetailPage({params}: Props) {
  const {slug} = await params;
  const article = await getNewsArticleBySlug(slug);
  if (!article) notFound();
  return <ArticleDetailView article={article} basePath="/news" type="news" />;
}

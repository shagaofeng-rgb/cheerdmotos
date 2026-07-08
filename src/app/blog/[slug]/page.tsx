import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ArticleDetailView} from '@/components/ArticleViews';
import {getAllBlogSlugs, getBlogArticleBySlug} from '@/lib/blogFeed';

type Props = {params: Promise<{slug: string}>};

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return (await getAllBlogSlugs()).map((slug) => ({slug}));
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params;
  const article = await getBlogArticleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: {canonical: `/blog/${article.slug}`},
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

export default async function BlogDetailPage({params}: Props) {
  const {slug} = await params;
  const article = await getBlogArticleBySlug(slug);
  if (!article) notFound();
  return <ArticleDetailView article={article} basePath="/blog" type="blog" />;
}

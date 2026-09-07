import type {Metadata} from 'next';
import {ArticleListView} from '@/components/ArticleViews';
import {getAllBlogArticles} from '@/lib/blogFeed';
import {siteUrl} from '@/lib/site';
import {readPage, readParam, type SearchParams} from '@/lib/storefrontPagination';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'COWIN Blog',
  description: 'COWIN buying guides, product knowledge and electric mobility planning resources.',
  alternates: {canonical: `${siteUrl}/blog`}
};

export default async function BlogPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const [articles, query] = await Promise.all([getAllBlogArticles(), searchParams]);
  return (
    <ArticleListView
      title="COWIN Blog"
      eyebrow="Buying guides"
      description="Product education and practical guidance for electric dirt bike, e-bike and smart mobility buyers."
      articles={articles}
      basePath="/blog"
      page={readPage(query.page)}
      category={readParam(query.category)}
      query={query}
    />
  );
}

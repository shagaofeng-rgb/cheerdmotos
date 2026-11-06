import type {Metadata} from 'next';
import {ArticleListView} from '@/components/ArticleViews';
import {getAllBlogArticles} from '@/lib/blogFeed';
import {siteUrl} from '@/lib/site';
import {ARTICLE_PAGE_SIZE, listPageMetadata, readPage, readParam, type SearchParams} from '@/lib/storefrontPagination';

export const dynamic = 'force-dynamic';

export async function generateMetadata({searchParams}: {searchParams: Promise<SearchParams>}): Promise<Metadata> {
  const query = await searchParams;
  const count = query.page ? (await getAllBlogArticles()).length : 0;
  return {
    title: 'COWIN Blog',
    description: 'Buying guides and model comparisons for electric dirt bikes, e-bikes and electric wheelchairs.',
    ...listPageMetadata(`${siteUrl}/blog`, query, count, ARTICLE_PAGE_SIZE, Boolean(readParam(query.category)))
  };
}

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

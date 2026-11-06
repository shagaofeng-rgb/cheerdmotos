import type {Metadata} from 'next';
import {ArticleListView} from '@/components/ArticleViews';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteUrl} from '@/lib/site';
import {ARTICLE_PAGE_SIZE, listPageMetadata, readPage, readParam, type SearchParams} from '@/lib/storefrontPagination';

export const dynamic = 'force-dynamic';

export async function generateMetadata({searchParams}: {searchParams: Promise<SearchParams>}): Promise<Metadata> {
  const query = await searchParams;
  const count = query.page ? (await getAllNewsArticles()).length : 0;
  return {
    title: 'COWIN News',
    description: 'Electric mobility news with sources, dates and context for riders and buyers.',
    ...listPageMetadata(`${siteUrl}/news`, query, count, ARTICLE_PAGE_SIZE, Boolean(readParam(query.category)))
  };
}

export default async function NewsPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const [articles, query] = await Promise.all([getAllNewsArticles(), searchParams]);
  return (
    <ArticleListView
      title="COWIN News"
      eyebrow="Source-attributed updates"
      description="News and market updates connected to COWIN electric dirt bikes, e-bikes, mobility products and buyer workflows."
      articles={articles}
      basePath="/news"
      page={readPage(query.page)}
      category={readParam(query.category)}
      query={query}
    />
  );
}

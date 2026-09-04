import type {Metadata} from 'next';
import {ArticleListView} from '@/components/ArticleViews';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteUrl} from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'COWIN News',
  description: 'Source-attributed electric mobility news, market updates and COWIN product analysis.',
  alternates: {canonical: `${siteUrl}/news`}
};

export default async function NewsPage() {
  const articles = await getAllNewsArticles();
  return (
    <ArticleListView
      title="COWIN News"
      eyebrow="Source-attributed updates"
      description="News and market updates connected to COWIN electric dirt bikes, e-bikes, mobility products and buyer workflows."
      articles={articles}
      basePath="/news"
    />
  );
}

import type {Metadata} from 'next';
import {ArticleListView} from '@/components/ArticleViews';
import {getAllNewsArticles} from '@/lib/newsFeed';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CHEERDMOTO News',
  description: 'Source-attributed electric mobility news, market updates and CHEERDMOTO product analysis.',
  alternates: {canonical: '/news'}
};

export default async function NewsPage() {
  const articles = await getAllNewsArticles();
  return (
    <ArticleListView
      title="CHEERDMOTO News"
      eyebrow="Source-attributed updates"
      description="News and market updates connected to CHEERDMOTO electric dirt bikes, e-bikes, mobility products and buyer workflows."
      articles={articles}
      basePath="/news"
    />
  );
}

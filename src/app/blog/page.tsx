import type {Metadata} from 'next';
import {ArticleListView} from '@/components/ArticleViews';
import {getAllBlogArticles} from '@/lib/blogFeed';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CHEERDMOTO Blog',
  description: 'CHEERDMOTO buying guides, product knowledge and electric mobility planning resources.',
  alternates: {canonical: '/blog'}
};

export default async function BlogPage() {
  const articles = await getAllBlogArticles();
  return (
    <ArticleListView
      title="CHEERDMOTO Blog"
      eyebrow="Buying guides"
      description="Product education and practical guidance for electric dirt bike, e-bike and smart mobility buyers."
      articles={articles}
      basePath="/blog"
    />
  );
}

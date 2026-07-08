import type {Metadata} from 'next';
import Link from 'next/link';
import {getAllBlogArticles} from '@/lib/blogFeed';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteData} from '@/lib/site';

type Props = {searchParams: Promise<{q?: string}>};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search CHEERDMOTO',
  description: 'Search CHEERDMOTO products, news, buying guides and support pages.',
  alternates: {canonical: '/search'}
};

export default async function SearchPage({searchParams}: Props) {
  const {q = ''} = await searchParams;
  const query = q.trim().toLowerCase();
  const [news, blogs] = await Promise.all([getAllNewsArticles(), getAllBlogArticles()]);
  const rows = [
    ...siteData.items.map((item) => ({title: item.title, excerpt: item.description, href: item.route, type: item.kind})),
    ...news.map((item) => ({title: item.title, excerpt: item.excerpt, href: `/news/${item.slug}`, type: 'news'})),
    ...blogs.map((item) => ({title: item.title, excerpt: item.excerpt, href: `/blog/${item.slug}`, type: 'blog'}))
  ];
  const results = query ? rows.filter((row) => `${row.title} ${row.excerpt} ${row.type}`.toLowerCase().includes(query)).slice(0, 40) : rows.slice(0, 20);

  return (
    <main className="search-page">
      <section className="article-hero">
        <p className="eyebrow">Search</p>
        <h1>Search CHEERDMOTO</h1>
        <p>Find products, News, Blog guides and support pages.</p>
        <form className="search-form" action="/search">
          <input name="q" defaultValue={q} placeholder="Search electric dirt bikes, XCEED, shipping..." />
          <button className="button primary" type="submit">Search</button>
        </form>
      </section>
      <section className="search-results">
        {results.map((row) => (
          <Link href={row.href} key={`${row.type}-${row.href}`}>
            <span>{row.type}</span>
            <strong>{row.title}</strong>
            <p>{row.excerpt}</p>
          </Link>
        ))}
        {!results.length ? <p>No matching results.</p> : null}
      </section>
    </main>
  );
}

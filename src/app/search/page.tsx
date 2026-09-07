import type {Metadata} from 'next';
import Link from 'next/link';
import {getAllBlogArticles} from '@/lib/blogFeed';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {siteData, siteUrl} from '@/lib/site';
import {PrecisionStorefrontFooter, PrecisionStorefrontHeader} from '@/components/PrecisionStorefrontChrome';
import StorefrontPagination from '@/components/StorefrontPagination';
import {paginateItems, readPage, type SearchParams} from '@/lib/storefrontPagination';

type Props = {searchParams: Promise<SearchParams>};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search COWIN',
  description: 'Search COWIN products, news, buying guides and support pages.',
  alternates: {canonical: `${siteUrl}/search`},
  robots: {index: false, follow: true}
};

export default async function SearchPage({searchParams}: Props) {
  const queryParams = await searchParams;
  const q = Array.isArray(queryParams.q) ? queryParams.q[0] || '' : queryParams.q || '';
  const query = q.trim().toLowerCase();
  const [news, blogs] = await Promise.all([getAllNewsArticles(), getAllBlogArticles()]);
  const rows = [
    ...siteData.items.map((item) => ({title: item.title, excerpt: item.description, href: item.route, type: item.kind})),
    ...news.map((item) => ({title: item.title, excerpt: item.excerpt, href: `/news/${item.slug}`, type: 'news'})),
    ...blogs.map((item) => ({title: item.title, excerpt: item.excerpt, href: `/blog/${item.slug}`, type: 'blog'}))
  ];
  const results = query ? rows.filter((row) => `${row.title} ${row.excerpt} ${row.type}`.toLowerCase().includes(query)) : rows;
  const pagedResults = paginateItems(results, readPage(queryParams.page));

  return (
    <main className="search-page precision-page">
      <PrecisionStorefrontHeader />
      <section className="article-hero">
        <p className="eyebrow">Search</p>
        <h1>Search COWIN</h1>
        <p>Find products, News, Blog guides and support pages.</p>
        <form className="search-form" action="/search">
          <input name="q" defaultValue={q} placeholder="Search electric dirt bikes, XCEED, shipping..." />
          <button className="button primary" type="submit">Search</button>
        </form>
      </section>
      <section className="search-results">
        {pagedResults.items.map((row) => (
          <Link href={row.href} key={`${row.type}-${row.href}`}>
            <span>{row.type}</span>
            <strong>{row.title}</strong>
            <p>{row.excerpt}</p>
          </Link>
        ))}
        {!results.length ? <p>No matching results.</p> : null}
      </section>
      <StorefrontPagination pathname="/search" params={queryParams} label="Search results" {...pagedResults} />
      <PrecisionStorefrontFooter />
    </main>
  );
}

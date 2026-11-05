import type {Metadata} from 'next';
import Link from 'next/link';
import {siteData, siteUrl} from '@/lib/site';
import {listPublicProducts} from '@/lib/publicCatalog';
import {modelLayout} from '@/lib/storefrontModels';
import {getAllNewsArticles} from '@/lib/newsFeed';
import {getAllBlogArticles} from '@/lib/blogFeed';
import {StorefrontV1, StoreIcon, StoreIntro, StoreLink} from '@/components/StorefrontV1';
import StorefrontPagination from '@/components/StorefrontPagination';
import {paginateItems, readPage, readParam, storefrontHref, type SearchParams} from '@/lib/storefrontPagination';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Search COWIN',
  description: 'Search COWIN products, news, buying guides and support pages.',
  alternates: {canonical: `${siteUrl}/search`},
  robots: {index: false, follow: true}
};

const filters = [['All', ''], ['Products', 'product'], ['Articles', 'article'], ['Support', 'support']] as const;

export default async function SearchPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const params = await searchParams;
  const q = readParam(params.q);
  const query = q.toLowerCase();
  const group = readParam(params.type);
  const [products, news, blogs] = await Promise.all([listPublicProducts(), getAllNewsArticles(), getAllBlogArticles()]);
  const rows = [
    ...products.map((item) => ({title: modelLayout(item.slug)?.title || item.title, excerpt: modelLayout(item.slug)?.intro || item.description, href: item.route, group: 'product', label: 'Product'})),
    ...news.map((item) => ({title: item.title, excerpt: item.excerpt, href: `/news/${item.slug}`, group: 'article', label: 'News'})),
    ...blogs.map((item) => ({title: item.title, excerpt: item.excerpt, href: `/blog/${item.slug}`, group: 'article', label: 'Blog'})),
    ...siteData.pages.map((item) => ({title: item.title, excerpt: item.description, href: item.route, group: 'support', label: 'Support'}))
  ];
  const results = rows.filter((row) => (!group || row.group === group) && (!query || `${row.title} ${row.excerpt} ${row.label}`.toLowerCase().includes(query)));
  const paged = paginateItems(results, readPage(params.page));

  return <StorefrontV1><main>
    <StoreIntro eyebrow="Explore COWIN" title="Search">Find products, articles and owner resources.</StoreIntro>
    <section className="shell section">
      <form className="searchfield" action="/search">
        <input type="search" aria-label="Search COWIN" name="q" defaultValue={q} placeholder="Search models, news or help" />
        {group && <input type="hidden" name="type" value={group} />}
        <button className="button primary" type="submit">Search</button>
      </form>
      <nav className="chips sf-spaced" aria-label="Search result types">{filters.map(([label, value]) => <Link key={label} className="chip" href={storefrontHref('/search', params, {type: value})} aria-current={group === value ? 'true' : undefined}>{label}</Link>)}</nav>
      <div className="resultlist sf-spaced">{paged.items.map((row) => <Link className="result" key={row.href} href={row.href}><div><p className="kicker">{row.label}</p><strong>{row.title}</strong><p>{row.excerpt}</p></div><StoreIcon name="arrow-right" /></Link>)}</div>
      {results.length === 0 && <div className="empty"><span className="state-symbol"><StoreIcon name="search" /></span><h2>No results found</h2><p>Try a model name such as XCEED, or browse the catalog.</p><StoreLink href="/products" primary arrow>Browse products</StoreLink></div>}
      <StorefrontPagination pathname="/search" params={params} label="Search results" {...paged} />
    </section>
  </main></StorefrontV1>;
}

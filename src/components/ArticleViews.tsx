import Link from 'next/link';
import Image from 'next/image';
import type {NewsArticle} from '@/lib/news';
import {siteUrl} from '@/lib/site';
import {listPublicProducts} from '@/lib/publicCatalog';
import StorefrontPagination from './StorefrontPagination';
import {StoreArt, StorefrontV1, StoreIcon, StoreIntro, StoreLink} from './StorefrontV1';
import {StoreProductCard} from './StorefrontCatalog';
import {ARTICLE_PAGE_SIZE, paginateItems, storefrontHref, type SearchParams} from '@/lib/storefrontPagination';

type ArticlePath = '/news' | '/blog';

function categoryId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function sourceName(article: NewsArticle) {
  return article.sourceName || article.sources[0]?.name || 'COWIN';
}

export function StoreArticleCard({article, basePath}: {article: NewsArticle; basePath: ArticlePath}) {
  return <Link className="card story-tile" href={`${basePath}/${article.slug}`} prefetch={false}>
    <div className="card-media">{article.hero && <Image src={article.hero} alt={article.heroAlt || ''} width={480} height={320} sizes="(max-width: 700px) 100vw, 33vw" />}</div>
    <div className="card-body"><p className="kicker">{article.category}</p><h3>{article.title}</h3><p>{article.excerpt}</p><div className="card-meta"><span>{article.date} · {sourceName(article)}</span><StoreIcon name="arrow-right" /></div></div>
  </Link>;
}

export function ArticleListView({title, eyebrow, description, articles, basePath, page, category, query}: {
  title: string; eyebrow: string; description: string; articles: NewsArticle[]; basePath: ArticlePath; page: number; category: string; query: SearchParams;
}) {
  const categories = [...new Set(articles.map((article) => article.category).filter(Boolean))].map((name) => ({name, id: categoryId(name)}));
  const activeCategory = categories.some(({id}) => id === category) ? category : '';
  const filtered = activeCategory ? articles.filter((article) => categoryId(article.category) === activeCategory) : articles;
  const pagination = paginateItems(filtered, page, ARTICLE_PAGE_SIZE);
  const featured = !activeCategory && pagination.page === 1 ? pagination.items[0] : undefined;
  const categoryHref = (next: string) => `${storefrontHref(basePath, query, {category: next || undefined})}#stories`;
  return <StorefrontV1><main>
    <StoreIntro eyebrow={eyebrow} title={title}>{description}</StoreIntro>
    {featured && <section className="shell section"><div className="feature">
      <StoreArt image={featured.hero} alt={featured.heroAlt} photo />
      <div className="feature-copy"><p className="kicker">Featured / {featured.category}</p><h2>{featured.title}</h2><p>{featured.excerpt}</p><p className="small">{featured.date} · {sourceName(featured)}</p><div className="actions"><StoreLink href={`${basePath}/${featured.slug}`} primary arrow>Read the story</StoreLink></div></div>
    </div></section>}
    <section className="shell section" id="stories">
      <header className="section-head"><div><p className="kicker">Browse</p><h2>{pagination.page === 1 ? 'Latest stories' : 'Earlier stories'}</h2></div></header>
      <div className="filterbar"><nav className="chips" aria-label="Article filters">
        <Link className="chip" href={categoryHref('')} aria-current={!activeCategory ? 'true' : undefined}>All</Link>
        {categories.map(({id, name}) => <Link className="chip" href={categoryHref(id)} key={id} aria-current={activeCategory === id ? 'true' : undefined}>{name}</Link>)}
      </nav></div>
      <div className="cards editorial">{pagination.items.filter((article) => article !== featured).map((article) => <StoreArticleCard article={article} basePath={basePath} key={article.slug} />)}</div>
      {!filtered.length && <div className="empty"><h2>No articles available</h2><p>Explore the COWIN product lineup and owner resources.</p><StoreLink primary arrow href="/discover">Discover COWIN</StoreLink></div>}
      <StorefrontPagination pathname={basePath} params={query} label={`${title} articles`} {...pagination} />
    </section>
  </main></StorefrontV1>;
}

export async function ArticleDetailView({article, basePath, type, activeSection}: {
  article: NewsArticle; basePath: ArticlePath; type: 'news' | 'blog'; activeSection: string;
}) {
  const source = article.sources[0];
  const sourceUrl = article.sourceUrl || source?.url;
  const safeSource = sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : undefined;
  const mode = activeSection === 'products' ? 'products' : ['sources', 'perspective'].includes(activeSection) ? 'sources' : 'overview';
  const related = mode === 'products' ? await listPublicProducts() : [];
  const models = related.filter(({slug}) => article.productSlugs?.includes(slug));
  const articlePath = `${basePath}/${article.slug}`;
  const canonicalUrl = `${siteUrl}${articlePath}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': type === 'news' ? 'NewsArticle' : 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    image: new URL(article.hero || '/', siteUrl).href,
    datePublished: article.date,
    dateModified: article.updatedAt,
    author: {'@type': 'Organization', name: 'COWIN Editorial Team'},
    publisher: {'@type': 'Organization', name: 'COWIN'},
    url: canonicalUrl,
    mainEntityOfPage: {'@type': 'WebPage', '@id': canonicalUrl},
    ...(type === 'news' && safeSource ? {isBasedOn: safeSource} : {})
  };

  return <StorefrontV1><main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')}} />
    <section className="shell section article-top">
      <Link className="inline" href={basePath}>← Back to {type === 'news' ? 'News' : 'Blog'}</Link>
      <p className="kicker sf-spaced">{article.category}</p><h1>{article.title}</h1><p className="lead">{article.excerpt}</p>
      <p className="article-source">{article.date} · {sourceName(article)}{article.readTime ? ` · ${article.readTime}` : ''}</p>
      {article.hero && <figure className="article-art"><StoreArt image={article.hero} alt={article.heroAlt || article.title} photo />{article.imageCredit && <figcaption>{article.imageCredit.publisher} · {article.imageCredit.note}</figcaption>}</figure>}
    </section>
    <article className="shell section sf-reading">
      <nav className="tabbar" aria-label="Article sections">
        <Link href={articlePath} scroll={false} aria-current={mode === 'overview' ? 'page' : undefined}>Read article</Link>
        <Link href={`${articlePath}?section=sources`} scroll={false} aria-current={mode === 'sources' ? 'page' : undefined}>Source &amp; context</Link>
        <Link href={`${articlePath}?section=products`} scroll={false} aria-current={mode === 'products' ? 'page' : undefined}>Related models</Link>
      </nav>
      <div className="pane">
        {mode === 'overview' && <div className="longcopy">
          {article.keyTakeaways.length > 0 && <aside className="panel"><h3>Key takeaways</h3><p>{article.keyTakeaways.join(' ')}</p></aside>}
          {article.body.map(({heading, paragraphs}, index) => index === 0
            ? <section key={index}><h3>{heading}</h3>{paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>
            : <details name="article-topic" key={index} open={activeSection === `topic-${index}` || undefined}><summary>{heading}</summary>{paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</details>)}
        </div>}
        {mode === 'sources' && <div className="longcopy">
          <h2>Source &amp; context</h2><dl className="speclist">
            <div><dt>Original title</dt><dd>{article.originalTitle || source?.title || article.title}</dd></div>
            <div><dt>Source</dt><dd>{safeSource ? <a className="inline" href={safeSource} rel="nofollow noopener noreferrer">{sourceName(article)}</a> : sourceName(article)}</dd></div>
            <div><dt>Published</dt><dd>{article.sourcePublishedAt?.slice(0, 10) || source?.publishedDate || article.date}</dd></div>
            <div><dt>Updated</dt><dd>{article.updatedAt}</dd></div>
          </dl>
          {(article.geoSummary || article.productFit) && <><h3>COWIN perspective</h3><p>{article.geoSummary || article.productFit}</p></>}
        </div>}
        {mode === 'products' && <><h2>Explore related COWIN models</h2><div className="cards">{(models.length ? models : related.slice(0, 3)).map((product) => <StoreProductCard item={product} key={product.slug} />)}</div>{!related.length && <StoreLink href="/products" arrow>Browse products</StoreLink>}</>}
      </div>
    </article>
  </main></StorefrontV1>;
}

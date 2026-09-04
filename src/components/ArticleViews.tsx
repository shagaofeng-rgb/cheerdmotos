import Link from 'next/link';
import Image from 'next/image';
import type {NewsArticle} from '@/lib/news';
import {productDetailedSpecs, products, type ProductSlug} from '@/lib/site';
import {PrecisionStorefrontFooter, PrecisionStorefrontHeader} from './PrecisionStorefrontChrome';

export function ArticleListView({title, eyebrow, description, articles, basePath}: {
  title: string;
  eyebrow: string;
  description: string;
  articles: NewsArticle[];
  basePath: '/news' | '/blog';
}) {
  const categories = [...new Set(articles.map((article) => article.category).filter(Boolean))];
  return (
    <main className="article-index precision-page">
      <PrecisionStorefrontHeader />
      <section className="article-hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <section className="article-toolbar" aria-label="Article filters">
        <Link href={basePath}>All</Link>
        {categories.map((category) => <span key={category}>{category}</span>)}
      </section>
      <section className="article-grid">
        {articles.map((article) => (
          <Link className="article-card" href={`${basePath}/${article.slug}`} key={article.slug}>
            <div className="article-card-media">
              <Image src={article.hero} alt={article.heroAlt || article.title} fill sizes="(max-width: 820px) 100vw, 50vw" />
            </div>
            <div className="article-card-copy">
              <span>{article.category}</span>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
              <small>{article.date} / {article.sourceName || article.sources[0]?.name || 'COWIN'}</small>
            </div>
          </Link>
        ))}
      </section>
      <PrecisionStorefrontFooter />
    </main>
  );
}

export function ArticleDetailView({article, basePath, type}: {
  article: NewsArticle;
  basePath: '/news' | '/blog';
  type: 'news' | 'blog';
}) {
  const productSlugs = ((article.productSlugs?.length ? article.productSlugs : inferProductSlugs(article)) as ProductSlug[])
    .filter((slug) => Object.prototype.hasOwnProperty.call(productDetailedSpecs, slug));
  const source = article.sources[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': type === 'news' ? 'NewsArticle' : 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    image: article.hero,
    datePublished: article.date,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: 'COWIN Editorial Team' },
    publisher: { '@type': 'Organization', name: 'COWIN' },
    mainEntityOfPage: `${basePath}/${article.slug}`
  };

  return (
    <main className="article-detail precision-page">
      <PrecisionStorefrontHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
      <section className="article-detail-hero">
        <Link className="article-back" href={basePath}>← Back to {type === 'news' ? 'News' : 'Blog'}</Link>
        <p className="eyebrow">{article.category}</p>
        <h1>{article.title}</h1>
        <p>{article.excerpt}</p>
        <div className="article-meta">
          <span>Published {article.date}</span>
          <span>Updated {article.updatedAt}</span>
          <span>{article.readTime}</span>
        </div>
        <div className="article-detail-media">
          <Image src={article.hero} alt={article.heroAlt || article.title} fill fetchPriority="high" sizes="(max-width: 1180px) 100vw, 1180px" />
        </div>
      </section>

      <article className="article-body">
        <section className="article-factbox">
          <h2>Source and fact summary</h2>
          <p>{article.keyTakeaways.join(' ')}</p>
          <dl>
            <div><dt>Original title</dt><dd>{article.originalTitle || source?.title || article.title}</dd></div>
            <div><dt>Original source</dt><dd>{article.sourceName || source?.name || 'COWIN'}</dd></div>
            <div><dt>Original published time</dt><dd>{article.sourcePublishedAt?.slice(0, 10) || source?.publishedDate || article.date}</dd></div>
            <div><dt>Source accessed</dt><dd>{article.sourceFetchedAt?.slice(0, 10) || article.updatedAt}</dd></div>
            <div><dt>Source URL</dt><dd><a href={article.sourceUrl || source?.url || '#'} rel="nofollow noopener noreferrer">{article.sourceUrl || source?.url || 'Source retained in CMS'}</a></dd></div>
          </dl>
        </section>

        {article.body.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}

        <section>
          <h2>COWIN perspective</h2>
          <p>{article.geoSummary || article.productFit}</p>
        </section>

        <section>
          <h2>Related COWIN products</h2>
          <div className="article-product-grid">
            {productSlugs.map((slug) => (
              <Link className="article-product-card" href={`/products/${slug}`} key={slug}>
                <div className="article-product-media">
                  <Image src={products[slug].image} alt={products[slug].name} fill sizes="(max-width: 820px) 100vw, 44vw" />
                </div>
                <strong>{products[slug].name}</strong>
                <span>{products[slug].category}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="article-source-note">
          <h2>Information source</h2>
          <p>This article is based on public source information and independent COWIN analysis. Original reporting belongs to the original publisher.</p>
          <p>Image credit: {article.imageCredit?.publisher || 'COWIN'} - {article.imageCredit?.note || 'Product image used for contextual illustration.'}</p>
        </section>
      </article>
      <PrecisionStorefrontFooter />
    </main>
  );
}

function inferProductSlugs(article: NewsArticle) {
  const text = `${article.title} ${article.excerpt} ${article.tags.join(' ')}`.toLowerCase();
  const matches = (Object.keys(products) as ProductSlug[]).filter((slug) => {
    const product = products[slug];
    return text.includes(slug.split('-')[0]) || text.includes(product.category.toLowerCase().split(' ')[0]);
  });
  return matches.length ? matches.slice(0, 3) : ['xceed-electric-dirt-bike'];
}

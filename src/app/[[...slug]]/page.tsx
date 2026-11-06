import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {connection} from 'next/server';
import {
  itemByRoute,
  routeFromSegments,
  segmentsFromRoute,
  siteData,
  siteUrl
} from "@/lib/site";
import {getPublicProductBySlug, listPublicProducts} from '@/lib/publicCatalog';
import {getAllBlogArticles} from "@/lib/blogFeed";
import {getAllNewsArticles} from "@/lib/newsFeed";
import ProductDetail from '@/components/ProductDetail';
import PrecisionHomepage from '@/components/PrecisionHomepage';
import {StorefrontV1} from '@/components/StorefrontV1';
import {collectionProducts, StorefrontCatalog, StoreProductCard} from '@/components/StorefrontCatalog';
import {StorefrontServices} from '@/components/StorefrontServices';
import {StoreArticleCard} from '@/components/ArticleViews';
import {productPresentation} from '@/lib/productPresentation';
import {modelLayout} from '@/lib/storefrontModels';
import {contiguousUsStates} from '@/lib/shipping';
import {CATALOG_PAGE_SIZE, listPageMetadata, readParam, type SearchParams} from '@/lib/storefrontPagination';
import type { SiteItem } from "@/types";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<SearchParams>;
};

export function generateStaticParams() {
  return siteData.items.map((item) => ({
    slug: segmentsFromRoute(item.route)
  }));
}

async function resolvedItem(route: string) {
  if (route.startsWith('/products/')) {
    return getPublicProductBySlug(route.slice('/products/'.length));
  }
  return itemByRoute(route);
}

export async function generateMetadata({params, searchParams}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await resolvedItem(routeFromSegments(slug));

  if (!item) return {};
  const product = item.kind === 'product' ? productPresentation(item) : null;
  const metaImage = product?.gallery[0] || (item.kind === 'product' ? '' : item.image);
  const canonical = `${siteUrl}${item.route}`;
  const query = item.kind === 'collection' ? await searchParams : null;
  const listing = query && (query.page || query.sort)
    ? listPageMetadata(canonical, query, (await collectionProducts(item.route)).length, CATALOG_PAGE_SIZE, Boolean(readParam(query.sort)))
    : {alternates: {canonical}};

  return {
    title: item.kind === "home" ? { absolute: item.title } : item.seoTitle ? {absolute: item.seoTitle} : product?.displayName || item.title,
    description: item.seoDescription || product?.shortDescription || item.description,
    ...listing,
    openGraph: {
      title: product?.displayName || item.title,
      description: product?.shortDescription || item.description,
      images: metaImage ? [{ url: metaImage }] : []
    },
    twitter: {
      card: 'summary_large_image',
      title: product?.displayName || item.title,
      description: product?.shortDescription || item.description,
      images: metaImage ? [metaImage] : []
    }
  };
}

export default async function MigratedPage({ params, searchParams }: PageProps) {
  const {slug} = await params;
  if (!slug?.length) {
    await connection();
    return <PrecisionHomepage />;
  }
  const item = await resolvedItem(routeFromSegments(slug));

  if (!item) notFound();
  const query = await searchParams;

  if (item.kind === "product") {
    return <ProductPage item={item} section={readParam(query.section)} />;
  }

  if (item.kind === "collection") {
    return <StorefrontCatalog item={item} query={query} />;
  }

  return <StorefrontServices item={item} section={readParam(query.section)} query={readParam(query.q)} requestedProduct={readParam(query.product)} schema={item.route === '/shipping-returns'
    ? <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(merchantPolicyJsonLd)}} />
    : undefined} />;
}

const merchantPolicyUrl = `${siteUrl}/shipping-returns`;
const merchantPolicyJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "COWIN",
  url: siteUrl,
  hasMerchantReturnPolicy: {
    "@id": `${merchantPolicyUrl}#return-policy`,
    "@type": "MerchantReturnPolicy",
    applicableCountry: "US",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    merchantReturnLink: merchantPolicyUrl
  },
  hasShippingService: {
    "@id": `${merchantPolicyUrl}#shipping-policy`,
    "@type": "ShippingService",
    name: "COWIN Contiguous U.S. Shipping",
    description: "Free shipping for orders delivered to the contiguous United States.",
    fulfillmentType: "https://schema.org/FulfillmentTypeDelivery",
    shippingConditions: {
      "@type": "ShippingConditions",
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "US",
        addressRegion: contiguousUsStates
      },
      shippingRate: {
        "@type": "MonetaryAmount",
        value: 0,
        currency: "USD"
      }
    }
  }
};

async function ProductPage({ item, section }: { item: SiteItem; section: string }) {
  const presentation = productPresentation(item);
  const displayItem = {...item, image: presentation.gallery[0] || ''};
  const [catalog, news, blogs] = section === 'resources'
    ? await Promise.all([listPublicProducts(), getAllNewsArticles(), getAllBlogArticles()])
    : [[], [], []];
  const related = catalog.filter((product) => product.slug !== item.slug).slice(0, 4);
  const linkedNews = news.filter((article) => article.productSlugs?.includes(item.slug)).slice(0, 3);
  const linkedBlogs = blogs.filter((article) => article.productSlugs?.includes(item.slug)).slice(0, 3);
  const offer = item.offer;
  const visibleSpecs = modelLayout(item.slug)?.quickSpecs || presentation.quickSpecs;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: presentation.displayName,
    description: presentation.shortDescription,
    brand: { "@type": "Brand", name: "COWIN" },
    sku: presentation.sku,
    url: `${siteUrl}${item.route}`,
    additionalProperty: visibleSpecs.map(({label, value}) => ({"@type": "PropertyValue", name: label, value})),
    ...(presentation.gallery.length ? {image: presentation.gallery.map((image) => new URL(image, siteUrl).href)} : {}),
    offers: offer?.priceCents && (offer.canCart || offer.canDirectOrder) ? {
      "@type": "Offer",
      priceCurrency: item.currency || "USD",
      price: (offer.priceCents / 100).toFixed(2),
      availability: offer.available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: "https://schema.org/NewCondition",
      hasMerchantReturnPolicy: { "@id": `${merchantPolicyUrl}#return-policy` },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        hasShippingService: { "@id": `${merchantPolicyUrl}#shipping-policy` }
      },
      url: `${siteUrl}${item.route}`
    } : undefined
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.cheerdmotos.com/' },
      { '@type': 'ListItem', position: 2, name: 'Products', item: 'https://www.cheerdmotos.com/products' },
      { '@type': 'ListItem', position: 3, name: presentation.category, item: `https://www.cheerdmotos.com${presentation.categoryRoute}` },
      { '@type': 'ListItem', position: 4, name: presentation.displayName, item: `https://www.cheerdmotos.com${item.route}` }
    ]
  };

  return (
    <StorefrontV1 className="pdp"><main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c')}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c')}} />
      <ProductDetail key={item.slug} item={displayItem} product={presentation} activeSection={section} />
      {section === 'resources' && <section className="shell section">
        {([['Related News', '/news', linkedNews.length ? linkedNews : news.slice(0, 3)], ['Related Guides', '/blog', linkedBlogs.length ? linkedBlogs : blogs.slice(0, 3)]] as const).map(([title, path, articles]) => articles.length > 0 && <div className="sf-spaced" key={path}><h2>{title}</h2><div className="cards editorial">{articles.map((article) => <StoreArticleCard article={article} basePath={path} key={article.slug} />)}</div></div>)}
        {related.length > 0 && <div className="sf-spaced"><h2>Related products</h2><div className="cards">{related.map((product) => <StoreProductCard item={product} key={product.slug} />)}</div></div>}
      </section>}
    </main></StorefrontV1>
  );
}

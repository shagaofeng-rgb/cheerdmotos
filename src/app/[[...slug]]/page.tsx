import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  featuredProducts,
  itemByRoute,
  relatedItems,
  routeFromSegments,
  segmentsFromRoute,
  siteData,
  siteUrl
} from "@/lib/site";
import {getPublicProductBySlug, listPublicProducts} from '@/lib/publicCatalog';
import {getAllBlogArticles} from "@/lib/blogFeed";
import {getAllNewsArticles} from "@/lib/newsFeed";
import ProductDetail from '@/components/ProductDetail';
import ContactInquiryForm from '@/components/ContactInquiryForm';
import PrecisionHomepage from '@/components/PrecisionHomepage';
import {PrecisionStorefrontFooter, PrecisionStorefrontHeader} from '@/components/PrecisionStorefrontChrome';
import {productPresentation} from '@/lib/productPresentation';
import type { SiteItem } from "@/types";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await resolvedItem(routeFromSegments(slug));

  if (!item) return {};

  return {
    title: item.kind === "home" ? { absolute: item.title } : item.kind === 'product' ? productPresentation(item).displayName : item.title,
    description: item.kind === 'product' ? productPresentation(item).shortDescription : item.description,
    alternates: {
      canonical: `${siteUrl}${item.route === "/" ? "/" : item.route}`
    },
    openGraph: {
      title: item.kind === 'product' ? productPresentation(item).displayName : item.title,
      description: item.kind === 'product' ? productPresentation(item).shortDescription : item.description,
      images: item.image ? [{ url: item.image }] : []
    },
    twitter: {
      card: 'summary_large_image',
      title: item.kind === 'product' ? productPresentation(item).displayName : item.title,
      description: item.kind === 'product' ? productPresentation(item).shortDescription : item.description,
      images: item.image ? [item.image] : []
    }
  };
}

export default async function MigratedPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await resolvedItem(routeFromSegments(slug));

  if (!item) notFound();

  if (item.kind === "home") {
    return <PrecisionHomepage />;
  }

  if (item.kind === "product") {
    return <ProductPage item={item} />;
  }

  if (item.kind === "collection") {
    return <CollectionPage item={item} />;
  }

  if (item.route === "/shipping-returns") {
    return <ShippingReturnsPage />;
  }

  return <ContentPage item={item} />;
}

const merchantPolicyUrl = `${siteUrl}/shipping-returns`;
const contiguousUsStates = [
  "AL", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

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

const designBase = "/design-package-v3/cheerdmoto_style_a_rally_terrain_full_package";
const usableDir = "03_%E4%BD%BF%E7%94%A8%E5%9B%BE_usable";

type CategoryProduct = {
  name: string;
  spec: string;
  price: string;
  image: string;
  href: string;
};

type CategoryDesign = {
  label: string;
  headline: string;
  intro: string;
  heroImage: string;
  products: CategoryProduct[];
  features: string[];
  ctaTitle: string;
  ctaCopy: string;
  ctaImage: string;
};

const categoryDesigns: Record<string, CategoryDesign> = {
  "/electric-dirt-bikes": {
    label: "NEXT-GEN PERFORMANCE",
    headline: "DIRT BIKES BUILT FOR THE WILD",
    intro: "High-output electric dirt bikes with serious torque, long range, and trail-ready control.",
    heroImage: `${designBase}/01_category_dirt_bikes/${usableDir}/01_extracted_from_page/dirt_bikes_use_hero_scene.png`,
    ctaImage: `${designBase}/01_category_dirt_bikes/${usableDir}/01_extracted_from_page/dirt_bikes_use_editorial_scene.png`,
    ctaTitle: "RALLY POWER. REAL TERRAIN.",
    ctaCopy: "Choose the platform that matches your riding style, from balanced 72V agility to uncompromised 96V output.",
    features: ["up to 15,000w peak power", "up to 72 mph top speed", "up to 95 km estimated range"],
    products: [
      {
        name: "XCEED",
        spec: "72V electric dirt bike",
        price: "$3,099",
        image: `${designBase}/01_category_dirt_bikes/${usableDir}/02_related_products/dirt_bikes_use_product_xceed.png`,
        href: "/products/xceed-electric-dirt-bike"
      },
      {
        name: "XTREME",
        spec: "96V flagship dirt bike",
        price: "From $4,499",
        image: `${designBase}/01_category_dirt_bikes/${usableDir}/02_related_products/dirt_bikes_use_product_xtreme.png`,
        href: "/products/cheerdmoto-performance-96v-electric-dirtbike-xtreme"
      },
      {
        name: "REFURBISHED XCEED",
        spec: "72V inspected clearance model",
        price: "From $2,599",
        image: `${designBase}/01_category_dirt_bikes/${usableDir}/01_extracted_from_page/dirt_bikes_use_product_card_03.png`,
        href: "/clearance"
      }
    ]
  },
  "/e-bikes": {
    label: "CITY RANGE",
    headline: "RIDE FREE. RIDE HAPPY.",
    intro: "Fat-tire e-bikes built for daily errands, weekend detours, and confident all-road comfort.",
    heroImage: `${designBase}/02_category_e_bike/${usableDir}/01_extracted_from_page/e_bike_use_hero_scene.png`,
    ctaImage: `${designBase}/02_category_e_bike/${usableDir}/01_extracted_from_page/e_bike_use_editorial_scene.png`,
    ctaTitle: "COMMUTE CLEAN. EXPLORE MORE.",
    ctaCopy: "Pick the frame that fits your day: low-step access, over-frame utility, or full-suspension comfort.",
    features: ["1350w peak motor", "fat tire stability", "city and trail utility"],
    products: [
      {
        name: "XCITE",
        spec: "step-thru fat tire e-bike",
        price: "From $499",
        image: `${designBase}/02_category_e_bike/${usableDir}/02_related_products/e_bike_use_product_xcite.png`,
        href: "/products/grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto"
      },
      {
        name: "XPLORE",
        spec: "over-frame utility e-bike",
        price: "From $599",
        image: `${designBase}/02_category_e_bike/${usableDir}/02_related_products/e_bike_use_product_xplore.png`,
        href: "/products/grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto"
      },
      {
        name: "XPLUS",
        spec: "full-suspension comfort",
        price: "From $599",
        image: `${designBase}/02_category_e_bike/${usableDir}/02_related_products/e_bike_use_product_xplus.png`,
        href: "/products/grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike"
      }
    ]
  },
  "/electric-wheelchairs": {
    label: "SMART MOBILITY",
    headline: "FREEDOM. COMFORT. MOBILITY.",
    intro: "Compact electric wheelchair mobility for everyday independence, travel, and confident indoor-outdoor movement.",
    heroImage: `${designBase}/03_category_electric_wheelchair/${usableDir}/01_extracted_from_page/electric_wheelchair_use_hero_scene.png`,
    ctaImage: `${designBase}/03_category_electric_wheelchair/${usableDir}/01_extracted_from_page/electric_wheelchair_use_lifestyle_1.png`,
    ctaTitle: "MOBILITY WITHOUT LIMITS.",
    ctaCopy: "Smart B02 folds into a practical daily platform with stable control and thoughtful comfort.",
    features: ["dual 250w motors", "lightweight folding frame", "indoor and outdoor use"],
    products: [
      {
        name: "SMART B02",
        spec: "electric wheelchair",
        price: "Shop mobility",
        image: `${designBase}/03_category_electric_wheelchair/${usableDir}/02_related_products/electric_wheelchair_use_product_smart_b02.png`,
        href: "/products/cheerdmoto-electric-wheelchair-smart-b02"
      }
    ]
  },
  "/accessories": {
    label: "GEAR & PARTS",
    headline: "ACCESSORIES THAT KEEP YOU MOVING.",
    intro: "Replacement parts, rider gear, and everyday upgrades for COWIN electric bikes and dirt bikes.",
    heroImage: `${designBase}/04_category_parts_accessories/${usableDir}/01_extracted_from_page/parts_accessories_use_hero_scene.png`,
    ctaImage: `${designBase}/04_category_parts_accessories/${usableDir}/01_extracted_from_page/parts_accessories_use_cta_scene.png`,
    ctaTitle: "READY FOR THE NEXT RIDE.",
    ctaCopy: "Keep your machine tuned, protected, and ready with core accessories and service parts.",
    features: ["model-specific fit", "service-ready parts", "rider-focused upgrades"],
    products: Array.from({ length: 12 }, (_, index) => {
      const number = String(index + 1).padStart(2, "0");
      return {
        name: `ACCESSORY ${number}`,
        spec: index < 4 ? "popular upgrade" : index < 8 ? "replacement part" : "rider essential",
        price: "View details",
        image: `${designBase}/04_category_parts_accessories/${usableDir}/01_extracted_from_page/parts_accessories_use_accessory_${number}.png`,
        href: "/accessories"
      };
    })
  }
};

function RallySiteNav() {
  return <PrecisionStorefrontHeader />;
}


function HomePage({ item }: { item: SiteItem }) {
  const products = featuredProducts(8);
  const collections = siteData.collections.slice(0, 6);
  const articles = siteData.articles.slice(0, 3);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Wholesale electric mobility</p>
          <h1>{item.title || "COWIN"}</h1>
          <p>{item.description}</p>
          <div className="action-row">
            <Link className="button primary" href="/dealer-program">
              Become a Dealer
            </Link>
            <Link className="button secondary" href="/products">
              View Products
            </Link>
          </div>
        </div>
        {item.image ? (
          <div className="hero-media">
            <Image src={item.image} alt={item.title} fill priority sizes="(max-width: 900px) 100vw, 48vw" />
          </div>
        ) : null}
      </section>

      <section className="metrics-band">
        <div>
          <strong>Dealer pricing</strong>
          <span>Bulk order programs</span>
        </div>
        <div>
          <strong>24-month warranty</strong>
          <span>Support for partners</span>
        </div>
        <div>
          <strong>Worldwide shipping</strong>
          <span>Export-ready mobility products</span>
        </div>
      </section>

      <ProductGrid title="Featured Products" items={products} />
      <CardGrid title="Collections" items={collections} />
      <CardGrid title="Latest News" items={articles} />

      <GeneratedContent item={item} compact />
    </main>
  );
}

async function ProductPage({ item }: { item: SiteItem }) {
  const presentation = productPresentation(item);
  const [catalog, news, blogs] = await Promise.all([listPublicProducts(), getAllNewsArticles(), getAllBlogArticles()]);
  const related = catalog.filter((product) => product.slug !== item.slug).slice(0, 4);
  const linkedNews = news.filter((article) => article.productSlugs?.includes(item.slug)).slice(0, 3);
  const linkedBlogs = blogs.filter((article) => article.productSlugs?.includes(item.slug)).slice(0, 3);
  const price = Number(String(item.price || '').replace(/[^0-9.]/g, ''));
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: presentation.displayName,
    description: presentation.shortDescription,
    brand: { "@type": "Brand", name: "COWIN" },
    sku: presentation.sku,
    ...(presentation.gallery.length ? {image: presentation.gallery.map((image) => `https://www.cheerdmotos.com${image}`)} : {}),
    offers: Number.isFinite(price) && price > 0 ? {
      "@type": "Offer",
      priceCurrency: item.currency || "USD",
      price: String(price),
      availability: (item.availability || "https://schema.org/InStock").replace(/^http:\/\//, 'https://'),
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
    <main className="precision-product-page">
      <RallySiteNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(productJsonLd)}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(breadcrumbJsonLd)}} />
      <ProductDetail item={item} product={presentation} />
      <ArticleLinkGrid title="Related News" basePath="/news" items={linkedNews.length ? linkedNews : news.slice(0, 3)} />
      <ArticleLinkGrid title="Related Guides" basePath="/blog" items={linkedBlogs.length ? linkedBlogs : blogs.slice(0, 3)} />
      <ProductGrid title="Related Products" items={related} />
      <RallyFooter />
    </main>
  );
}

function RallyFooter() {
  return <PrecisionStorefrontFooter />;
}

function ShippingReturnsPage() {
  return (
    <main className="policy-page">
      <RallySiteNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(merchantPolicyJsonLd)}} />
      <section className="policy-hero">
        <p className="eyebrow">Customer policy</p>
        <h1>Shipping &amp; returns</h1>
        <p>Clear delivery and return information for orders placed through COWIN.</p>
      </section>
      <section className="policy-content">
        <article id="shipping-policy">
          <p className="eyebrow">Shipping</p>
          <h2>Free shipping in the contiguous United States</h2>
          <p>COWIN offers free shipping for orders delivered to the 48 contiguous U.S. states. Delivery availability and any product-specific handling requirements are confirmed during checkout.</p>
        </article>
        <article id="return-policy">
          <p className="eyebrow">Returns</p>
          <h2>14-day return window</h2>
          <p>You may contact COWIN support to request a return within 14 days of delivery. Please wait for return instructions and authorization before sending an item back, so that product condition, order details, and the applicable return process can be confirmed.</p>
          <Link className="button" href="/support">Contact support</Link>
        </article>
      </section>
      <RallyFooter />
    </main>
  );
}

function ArticleLinkGrid({title, basePath, items}: {title: string; basePath: "/news" | "/blog"; items: Awaited<ReturnType<typeof getAllNewsArticles>>}) {
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="content-grid">
        {items.map((article) => (
          <Link className="content-card" href={`${basePath}/${article.slug}`} key={`${basePath}-${article.slug}`}>
            <div className="content-image">
              <Image src={article.hero} alt={article.heroAlt || article.title} fill sizes="(max-width: 700px) 100vw, 30vw" />
            </div>
            <h3>{article.title}</h3>
            <p>{article.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RallyCategoryPage({ item, design }: { item: SiteItem; design: CategoryDesign }) {
  return (
    <main className="rally-category">
      <RallySiteNav />

      <section className="rally-category-hero">
        <img
          className="rally-category-hero-image"
          src={design.heroImage}
          alt={`${design.headline} COWIN collection`}
          decoding="async"
          fetchPriority="high"
        />
        <div className="rally-category-hero-shade" />
        <div className="rally-category-hero-copy">
          <span>{design.label}</span>
          <h1>{design.headline}</h1>
          <p>{design.intro}</p>
          <Link className="rally-btn" href="#rally-catalog">
            SHOP NOW
          </Link>
        </div>
      </section>

      <section className="rally-category-featurebar" aria-label={`${item.title} highlights`}>
        {design.features.map((feature) => (
          <div key={feature}>
            <strong>{feature.split(" ")[0]}</strong>
            <span>{feature}</span>
          </div>
        ))}
      </section>

      <section className="rally-category-shell" id="rally-catalog">
        <aside className="rally-filters" aria-label="Collection filters">
          <h2>{item.title}</h2>
          <p>{item.description || "Shop COWIN products by model, power, and riding style."}</p>
          {["category", "availability", "price", "model"].map((label) => (
            <button type="button" key={label}>
              <span>{label}</span>
              <span>+</span>
            </button>
          ))}
        </aside>

        <div className="rally-catalog">
          <div className="rally-catalog-heading">
            <p>{design.products.length} PRODUCTS</p>
            <h2>SHOP THE COLLECTION</h2>
          </div>
          <div className={design.products.length > 4 ? "rally-collection-grid is-accessories" : "rally-collection-grid"}>
            {design.products.map((product) => (
              <Link className="rally-collection-card" href={product.href} key={`${product.name}-${product.image}`}>
                <div>
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    sizes={
                      design.products.length > 4
                        ? "(max-width: 620px) 100vw, (max-width: 1080px) 50vw, 25vw"
                        : "(max-width: 620px) 100vw, (max-width: 1080px) 50vw, 33vw"
                    }
                  />
                </div>
                <h3>{product.name}</h3>
                <p>{product.spec}</p>
                <span>{product.price}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rally-value-strip">
        {["FREE SHIPPING", "14-DAY RETURNS", "LIFETIME SUPPORT"].map((label) => (
          <article key={label}>
            <h3>{label}</h3>
            <p>Clear policies and responsive support before and after your order.</p>
          </article>
        ))}
      </section>

      <section className="rally-editorial">
        <img src={design.ctaImage} alt={`${design.ctaTitle} COWIN editorial image`} loading="lazy" decoding="async" sizes="100vw" />
        <div>
          <span>{design.label}</span>
          <h2>{design.ctaTitle}</h2>
          <p>{design.ctaCopy}</p>
          <Link className="rally-btn" href="/support">
            ASK AN EXPERT
          </Link>
        </div>
      </section>

      <RallyFooter />
    </main>
  );
}

async function CollectionPage({ item }: { item: SiteItem }) {
  const design = categoryDesigns[item.route];
  const catalog = await listPublicProducts();

  if (design) {
    const categoryKey = item.route === '/electric-dirt-bikes' ? 'dirt bike' : item.route === '/e-bikes' ? 'e bike' : item.route === '/electric-wheelchairs' ? 'wheelchair' : item.route === '/accessories' ? 'accessories' : '';
    const liveProducts = catalog
      .filter((product) => categoryKey && `${product.title} ${product.description}`.toLowerCase().includes(categoryKey))
      .map((product) => ({name: product.title, spec: product.description || product.availability, price: product.price || 'Contact us', image: product.image, href: product.route}))
      .filter((product) => product.image);
    return <RallyCategoryPage item={item} design={{...design, products: liveProducts.length ? liveProducts : design.products}} />;
  }

  const products = catalog.filter((product) => {
    const text = `${product.title} ${product.description}`.toLowerCase();
    const slug = item.slug.replace(/-/g, " ");
    return text.includes(slug.split(" ")[0]) || item.slug === "all-products";
  });

  return (
    <main className="precision-collection-page">
      <RallySiteNav />
      <PageHero item={item} label="Collection" />
      <ProductGrid title={item.title} items={products.length ? products : catalog.slice(0, 12)} />
      <GeneratedContent item={item} compact />
      <RallyFooter />
    </main>
  );
}

function ContentPage({ item }: { item: SiteItem }) {
  const showInquiryForm = ['support', 'dealer-program', 'product-registration'].includes(item.slug);
  const inquiryCopy = {
    fields: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone / WhatsApp',
      company: 'Company',
      country: 'Country / region',
      buyerType: 'Request type',
      product: 'Product',
      quantity: 'Quantity',
      market: 'Target market',
      message: 'How can we help?',
      submit: 'Send request'
    },
    buyerTypes: ['Product support', 'Retail purchase', 'Dealer / distributor', 'Fleet / project', 'Warranty / service'],
    productOptions: siteData.products.map((product) => product.title)
  };
  return (
    <main className="precision-content-page">
      <RallySiteNav />
      <PageHero item={item} label={item.kind === "article" ? "Article" : "Page"} />
      <GeneratedContent item={item} />
      {showInquiryForm ? (
        <section className="inquiry-section">
          <div className="section-heading">
            <p className="eyebrow">Contact COWIN</p>
            <h2>Send your request</h2>
            <p>Required details help our sales and support team route your request correctly.</p>
          </div>
          <ContactInquiryForm copy={inquiryCopy} />
        </section>
      ) : null}
      <CardGrid title="Explore More" items={relatedItems(item)} />
      <RallyFooter />
    </main>
  );
}

function PageHero({ item, label }: { item: SiteItem; label: string }) {
  return (
    <section className="page-hero">
      <div>
        <p className="eyebrow">{label}</p>
        <h1>{item.title}</h1>
        {item.description ? <p>{item.description}</p> : null}
      </div>
      {item.image ? (
        <div className="page-hero-image">
          <Image src={item.image} alt={item.title} fill sizes="(max-width: 900px) 100vw, 34vw" />
        </div>
      ) : null}
    </section>
  );
}

function ProductGrid({ title, items }: { title: string; items: SiteItem[] }) {
  if (!items.length) return null;

  return (
    <section className="section">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="product-grid">
        {items.map((item) => (
          <Link className="product-card" href={item.route} key={item.route}>
            <div className="card-image">
              {item.image ? <Image src={item.image} alt={item.title} fill sizes="(max-width: 700px) 100vw, 25vw" /> : null}
            </div>
            <div className="card-copy">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.price ? (
                <span>
                  {item.currency} {item.price}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CardGrid({ title, items }: { title: string; items: SiteItem[] }) {
  if (!items.length) return null;

  return (
    <section className="section">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="content-grid">
        {items.map((item) => (
          <Link className="content-card" href={item.route} key={item.route}>
            {item.image ? (
              <div className="content-image">
                <Image src={item.image} alt={item.title} fill sizes="(max-width: 700px) 100vw, 30vw" />
              </div>
            ) : null}
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function GeneratedContent({ item, compact = false }: { item: SiteItem; compact?: boolean }) {
  const isProduct = item.kind === "product";
  const pageGuidance: Record<string, string> = {
    support: "Include your product model, order number, destination country, and a clear description of the question so the support team can respond efficiently.",
    about: "Learn how COWIN approaches electric mobility across performance riding, daily utility, and accessible transportation.",
    "dealer-program": "Share your market, expected order quantity, target products, and delivery destination to discuss dealer or fleet purchasing.",
    "rider-club": "Explore product updates, ownership resources, and stories for the COWIN rider community.",
    "product-registration": "Keep your product model, serial information, purchase date, and proof of purchase available when requesting registration support.",
    manuals: "Choose the matching product model before using setup, assembly, charging, or maintenance instructions.",
    warranty: "Review coverage before service and keep your order details, serial information, and supporting photos available for a warranty request.",
    "shipping-returns": "Delivery timing, freight cost, return eligibility, and handling requirements depend on the product, destination, and order status.",
    discover: "Browse product guides, comparisons, rider resources, and current COWIN updates."
  };

  return (
    <section className={compact ? "generated-section compact" : "generated-section"}>
      <div className="generated-content">
        <h2>{isProduct ? "Product overview" : "What to know"}</h2>
        {isProduct && item.description ? <p>{item.description}</p> : null}
        {isProduct ? (
          <ul>
            <li>New COWIN storefront page generated inside this Next.js site.</li>
            <li>This page renders only the new COWIN Next.js storefront content and checkout flow.</li>
            <li>Use the new checkout and support flow for current availability, service, and dealer questions.</li>
          </ul>
        ) : (
          <p>{pageGuidance[item.slug] || "Use the related resources on this page, or contact COWIN support when you need help with a product, order, delivery, or service question."}</p>
        )}
      </div>
    </section>
  );
}

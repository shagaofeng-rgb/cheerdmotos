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
  siteData
} from "@/lib/site";
import type { SiteItem } from "@/types";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return siteData.items.map((item) => ({
    slug: segmentsFromRoute(item.route)
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = itemByRoute(routeFromSegments(slug));

  if (!item) return {};

  return {
    title: item.kind === "home" ? { absolute: item.title } : item.title,
    description: item.description,
    alternates: {
      canonical: item.route
    },
    openGraph: {
      title: item.title,
      description: item.description,
      images: item.image ? [{ url: item.image }] : []
    }
  };
}

export default async function MigratedPage({ params }: PageProps) {
  const { slug } = await params;
  const item = itemByRoute(routeFromSegments(slug));

  if (!item) notFound();

  if (item.kind === "home") {
    return <RallyHomepage />;
  }

  if (item.kind === "product") {
    return <ProductPage item={item} />;
  }

  if (item.kind === "collection") {
    return <CollectionPage item={item} />;
  }

  return <ContentPage item={item} />;
}

const assetBase = "/homepage-assets/cheerdmoto_style_a_rally_terrain";

const garageProducts = [
  {
    name: "XTREME",
    spec: "96V - 15000W - 72 MPH",
    price: "From $4,499",
    image: `${assetBase}/assets/products/xtreme_transparent.png`,
    href: "/products/cheerdmoto-performance-96v-electric-dirtbike-xtreme",
    highlight: true
  },
  {
    name: "XCEED",
    spec: "72V - 8500W - 53 MPH",
    price: "$3,099",
    image: `${assetBase}/assets/products/xceed_transparent.png`,
    href: "/products/xceed-electric-dirt-bike",
    highlight: true
  },
  {
    name: "XPLUS",
    spec: "1200W - FULL SUSPENSION",
    price: "From $599",
    image: `${assetBase}/assets/products/xplus_transparent.png`,
    href: "/products/grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike"
  },
  {
    name: "XCITE",
    spec: "STEP-THRU - 900-1350W",
    price: "From $499",
    image: `${assetBase}/assets/products/xcite_transparent.png`,
    href: "/products/grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto"
  }
];

const cityProducts = [
  {
    name: "XCITE",
    spec: "Low-step access",
    image: `${assetBase}/assets/products/xcite_transparent.png`,
    href: "/products/grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto"
  },
  {
    name: "XPLORE",
    spec: "Over-frame utility",
    image: `${assetBase}/assets/products/xplore_transparent.png`,
    href: "/products/grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto"
  },
  {
    name: "XPLUS",
    spec: "Full-suspension comfort",
    image: `${assetBase}/assets/products/xplus_transparent.png`,
    href: "/products/grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike"
  }
];

const oldSiteNav = [
  {
    label: "ELECTRIC DIRT BIKE",
    href: "/collections/electric-dirt-bikes",
    children: [
      { label: "Xceed - 72V", href: "/products/xceed-electric-dirt-bike" },
      { label: "Xtreme - 96V", href: "/products/cheerdmoto-performance-96v-electric-dirtbike-xtreme" },
      { label: "Refurbished Xceed", href: "/products/cheerdmoto-xceed-72v-electric-dirt-bike-refurbished" }
    ]
  },
  {
    label: "E BIKE",
    href: "/collections/electric-bikes",
    children: [
      { label: "Xcite (Step-Thru)", href: "/products/grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto" },
      { label: "Xplore (Over-Frame)", href: "/products/grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto" },
      { label: "Xplus (Full-Suspension)", href: "/products/grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike" }
    ]
  },
  {
    label: "ELECTRIC WHEELCHAIR",
    href: "/collections/e-wheelchairs",
    children: [{ label: "Smart B02", href: "/products/cheerdmoto-electric-wheelchair-smart-b02" }]
  },
  { label: "ACCESSORIES", href: "/collections/parts-and-accessories" },
  { label: "REFURBISHED & CLEARANCE", href: "/collections/refurbished-clearance" },
  {
    label: "DISCOVER",
    href: "#",
    children: [
      { label: "Blog", href: "/blogs/electric-dirt-bike-guides" },
      { label: "About Us", href: "/pages/about-us" },
      { label: "Rider Club", href: "/pages/cheerdmoto-riders-club" },
      { label: "B2B Customer", href: "/pages/business-partner" },
      { label: "Ride to China", href: "/pages/ride-to-china-lotter" },
      { label: "Affiliate Marketing", href: "/pages/affiliate-program" }
    ]
  },
  {
    label: "SUPPORT",
    href: "#",
    children: [
      { label: "Contact Us", href: "/pages/contact-us" },
      { label: "Product Registration", href: "/pages/product-registration" },
      { label: "Manual & Assembly", href: "/blogs/manual-assembly" },
      { label: "Warranty Policy", href: "/pages/return-warranty-policy" },
      { label: "Shipping Policy", href: "/pages/shipping-policy" },
      { label: "Shipping & Returns", href: "/pages/shipping-returns" },
      { label: "Order Tracking", href: "https://cheerdmoto.com/apps/parcelpanel" }
    ]
  }
];

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
  "/collections/electric-dirt-bikes": {
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
        href: "/products/cheerdmoto-xceed-72v-electric-dirt-bike-refurbished"
      }
    ]
  },
  "/collections/electric-bikes": {
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
  "/collections/e-wheelchairs": {
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
  "/collections/parts-and-accessories": {
    label: "GEAR & PARTS",
    headline: "ACCESSORIES THAT KEEP YOU MOVING.",
    intro: "Replacement parts, rider gear, and everyday upgrades for CHEERDMOTO electric bikes and dirt bikes.",
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
        href: "/collections/parts-and-accessories"
      };
    })
  }
};

function RallySiteNav({ dark = false }: { dark?: boolean }) {
  return (
    <header className={dark ? "rally-nav rally-nav-dark" : "rally-nav"}>
      <Link className="rally-logo" href="/" aria-label="CHEERDMOTO home">
        <img
          alt="Cheerdmoto"
          height="34"
          src="https://cheerdmoto.com/cdn/shop/files/cheerdmoto_logo-transparent_180x.png?v=1747619683"
          width="180"
        />
      </Link>
      <nav aria-label="Main navigation">
        {oldSiteNav.map((item) => (
          <div className="rally-nav-item" key={item.label}>
            <Link href={item.href}>{item.label}</Link>
            {item.children?.length ? (
              <div className="rally-submenu">
                {item.children.map((child) => (
                  <Link href={child.href} key={child.label}>
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
      <div className="rally-icons">
        <Link className="rally-country" href="https://cheerdmoto.com">
          <img
            alt=""
            height="20"
            src="https://cheerdmoto.com/cdn/shop/files/united-states-of-america-flag-png-large.jpg?crop=center&height=20&v=1755131254&width=20"
            width="20"
          />
          <span>USA</span>
          <span aria-hidden="true">v</span>
        </Link>
        <Link className="rally-signin" href="https://cheerdmoto.com/customer_authentication/redirect?locale=en&region_country=US">
          Sign In
        </Link>
        <Link className="rally-icon-link" href="/search" aria-label="Search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
        </Link>
        <Link className="rally-icon-link" href="/pages/wishlist" aria-label="Wishlist">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.8 4.6c-1.8-1.9-4.8-1.8-6.6.1L12 7l-2.2-2.3c-1.8-1.9-4.8-2-6.6-.1-1.9 2-1.8 5.1.1 7L12 20l8.7-8.4c1.9-1.9 2-5 .1-7Z" />
          </svg>
        </Link>
        <Link className="rally-icon-link rally-cart" href="/cart" aria-label="Cart">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3h2l2.1 12.3a2 2 0 0 0 2 1.7h8.8a2 2 0 0 0 2-1.6L21 8H6" />
            <circle cx="9" cy="21" r="1.4" />
            <circle cx="18" cy="21" r="1.4" />
          </svg>
          <span>1</span>
        </Link>
        <button className="rally-menu-button" type="button" aria-label="Menu">
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

function RallyHomepage() {
  return (
    <main className="rally-home">
      <header className="rally-nav">
        <Link className="rally-logo" href="/" aria-label="CHEERDMOTO home">
          <img
            alt="Cheerdmoto"
            height="34"
            src="https://cheerdmoto.com/cdn/shop/files/cheerdmoto_logo-transparent_180x.png?v=1747619683"
            width="180"
          />
        </Link>
        <nav aria-label="Main navigation">
          {oldSiteNav.map((item) => (
            <div className="rally-nav-item" key={item.label}>
              <Link href={item.href}>{item.label}</Link>
              {item.children?.length ? (
                <div className="rally-submenu">
                  {item.children.map((child) => (
                    <Link href={child.href} key={child.label}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="rally-icons">
          <Link className="rally-country" href="https://cheerdmoto.com">
            <img
              alt=""
              height="20"
              src="https://cheerdmoto.com/cdn/shop/files/united-states-of-america-flag-png-large.jpg?crop=center&height=20&v=1755131254&width=20"
              width="20"
            />
            <span>USA</span>
            <span aria-hidden="true">⌄</span>
          </Link>
          <Link className="rally-signin" href="https://cheerdmoto.com/customer_authentication/redirect?locale=en&region_country=US">
            Sign In
          </Link>
          <Link className="rally-icon-link" href="/search" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </Link>
          <Link className="rally-icon-link" href="/pages/wishlist" aria-label="Wishlist">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.8 4.6c-1.8-1.9-4.8-1.8-6.6.1L12 7l-2.2-2.3c-1.8-1.9-4.8-2-6.6-.1-1.9 2-1.8 5.1.1 7L12 20l8.7-8.4c1.9-1.9 2-5 .1-7Z" />
            </svg>
          </Link>
          <Link className="rally-icon-link rally-cart" href="/cart" aria-label="Cart">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3h2l2.1 12.3a2 2 0 0 0 2 1.7h8.8a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="9" cy="21" r="1.4" />
              <circle cx="18" cy="21" r="1.4" />
            </svg>
            <span>1</span>
          </Link>
          <button className="rally-menu-button" type="button" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <section className="rally-hero">
        <img className="rally-hero-bg" src={`${assetBase}/assets/source/xtreme_lifestyle.webp`} alt="" />
        <div className="rally-hero-shade" />
        <div className="rally-hero-copy">
          <span className="rally-tag">NEW FLAGSHIP</span>
          <h1>POWER WITHOUT COMPROMISE.</h1>
          <h2>XTREME ELECTRIC DIRT BIKE</h2>
          <p>
            15,000W peak power, 72 MPH top speed and a 96V platform engineered for riders who expect instant
            torque and serious range.
          </p>
          <div className="rally-actions">
            <Link className="rally-btn rally-btn-orange" href="/products/cheerdmoto-performance-96v-electric-dirtbike-xtreme">
              PRE-ORDER XTREME
            </Link>
            <Link className="rally-btn rally-btn-light" href="/collections/electric-dirt-bikes">
              SHOP MODELS
            </Link>
          </div>
        </div>
        <p className="rally-hero-caption">RIDE FARTHER. GO FARTHER. OWN THE TERRAIN.</p>
      </section>

      <section className="rally-metrics" aria-label="Xtreme performance metrics">
        {[
          ["15,000W", "PEAK POWER"],
          ["72 MPH", "TOP SPEED"],
          ["95 KM", "EST. RANGE"],
          ["465 N·m", "MAX TORQUE"]
        ].map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="rally-garage">
        <div className="rally-section-head">
          <h2>THE CHEERDMOTO GARAGE</h2>
          <p>Current models from your live catalog - performance, commuter and mobility.</p>
        </div>
        <div className="rally-product-grid">
          {garageProducts.map((product) => (
            <Link className={product.highlight ? "rally-product-card is-hot" : "rally-product-card"} href={product.href} key={product.name}>
              <div className="rally-product-image">
                <img src={product.image} alt={`${product.name} electric mobility product`} />
              </div>
              <h3>{product.name}</h3>
              <p>{product.spec}</p>
              <strong>{product.price}</strong>
              <span>SHOP MODEL</span>
            </Link>
          ))}
        </div>
        <Link className="rally-small-link" href="/collections/all-products">
          VIEW ALL MODELS +
        </Link>
      </section>

      <section className="rally-xceed">
        <div className="rally-lines" />
        <img src={`${assetBase}/assets/products/xceed_transparent.png`} alt="XCEED electric dirt bike" />
        <div className="rally-xceed-copy">
          <span className="rally-tag">XCEED V2</span>
          <h2>BUILT TO FLY. TUNED TO WIN.</h2>
          <p>A balanced 72V platform with explosive 8,500W peak output, refined throttle mapping and trail riding modes.</p>
          <div className="rally-spec-grid">
            <div>
              <strong>8,500W</strong>
              <span>PEAK</span>
            </div>
            <div>
              <strong>53 MPH</strong>
              <span>TOP SPEED</span>
            </div>
            <div>
              <strong>53 MI</strong>
              <span>RANGE</span>
            </div>
            <div>
              <strong>380 N·m</strong>
              <span>TORQUE</span>
            </div>
          </div>
          <Link className="rally-btn rally-btn-orange" href="/products/xceed-electric-dirt-bike">
            EXPLORE XCEED
          </Link>
        </div>
      </section>

      <section className="rally-city">
        <div className="rally-section-head">
          <h2>CITY RANGE. TRAIL ATTITUDE.</h2>
          <p>Three Grandeux formats built around the way people actually move.</p>
        </div>
        <div className="rally-city-grid">
          {cityProducts.map((product) => (
            <Link className="rally-city-card" href={product.href} key={product.name}>
              <div>
                <img src={product.image} alt={`${product.name} electric bike`} />
              </div>
              <h3>{product.name}</h3>
              <p>{product.spec}</p>
              <span>GET AROUND SMARTER</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rally-mobility">
        <div className="rally-mobility-lines" />
        <div className="rally-mobility-copy">
          <h2>MOBILITY, WITHOUT LIMITS.</h2>
          <p>SMART B02 POWER WHEELCHAIR</p>
          <p>
            Dual 250W motors, a 15-mile range and a 350 lb load rating in a practical mobility platform for indoor and
            outdoor use.
          </p>
          <Link className="rally-btn rally-btn-mint" href="/products/cheerdmoto-electric-wheelchair-smart-b02">
            SHOP SMART B02
          </Link>
          <small>FOLDABLE FRAME - 12° CLIMBING - 360° JOYSTICK</small>
        </div>
        <img src={`${assetBase}/assets/products/smart_b02_transparent.png`} alt="SMART B02 electric wheelchair" />
      </section>

      <section className="rally-trust">
        <div className="rally-section-head">
          <h2>REAL PRODUCTS. REAL RIDERS.</h2>
          <p>Trust signals positioned before the final conversion point.</p>
        </div>
        <div className="rally-proof-grid">
          {[
            ["FREE SHIPPING", "All contiguous U.S. states"],
            ["14-DAY RETURNS", "Straightforward return window"],
            ["LIFETIME SUPPORT", "Dedicated after-sales help"],
            ["SECURE CHECKOUT", "Major payment methods"]
          ].map(([title, text]) => (
            <div key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="rally-review-grid">
          {[
            ["The instant torque made me switch from gas.", "Jason K. - San Diego"],
            ["Three weeks later, I had already put 600 miles on it.", "Daniel R. - Colorado Springs"],
            ["It gave me the outdoors back.", "Dr. Elena M. - Chicago"]
          ].map(([quote, name]) => (
            <blockquote key={quote}>
              <div>★★★★★</div>
              <p>"{quote}"</p>
              <cite>{name}</cite>
            </blockquote>
          ))}
        </div>
      </section>

      <footer className="rally-footer">
        <div>
          <Link className="rally-footer-logo" href="/">
            CHEERDMOTO
          </Link>
          <p>Electric mobility engineered for performance, utility and everyday independence.</p>
        </div>
        <div>
          <strong>SHOP</strong>
          <Link href="/collections/all-products">All models</Link>
          <Link href="/products/xceed-electric-dirt-bike">Xceed</Link>
          <Link href="/products/cheerdmoto-performance-96v-electric-dirtbike-xtreme">Xtreme</Link>
          <Link href="/products/grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike">Xplus</Link>
          <Link href="/products/cheerdmoto-electric-wheelchair-smart-b02">Smart B02</Link>
        </div>
        <div>
          <strong>SUPPORT</strong>
          <Link href="/pages/contact-us">Contact us</Link>
          <Link href="/pages/faq">FAQ</Link>
          <Link href="/pages/return-warranty-policy">Warranty</Link>
          <Link href="/pages/shipping-returns">Shipping & returns</Link>
        </div>
        <div>
          <strong>COMPANY</strong>
          <Link href="/pages/about-us">About us</Link>
          <Link href="/blogs/news">Rider club</Link>
          <Link href="/pages/business-partner">B2B dealers</Link>
          <Link href="/pages/affiliate-program">Affiliate program</Link>
        </div>
        <form>
          <strong>STAY UPDATED</strong>
          <input aria-label="Email address" placeholder="Email address" type="email" />
          <button type="button">SUBSCRIBE</button>
        </form>
      </footer>
    </main>
  );
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
          <h1>{item.title || "CHEERDMOTO"}</h1>
          <p>{item.description}</p>
          <div className="action-row">
            <Link className="button primary" href="/pages/business-partner">
              Become a Dealer
            </Link>
            <Link className="button secondary" href="/collections/all-products">
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

      <LegacyContent item={item} compact />
    </main>
  );
}

function ProductPage({ item }: { item: SiteItem }) {
  const related = relatedItems(item);

  return (
    <main>
      <section className="product-hero">
        <div className="product-gallery">
          {item.image ? (
            <Image src={item.image} alt={item.title} fill priority sizes="(max-width: 900px) 100vw, 46vw" />
          ) : (
            <div className="image-placeholder">CHEERDMOTO</div>
          )}
        </div>
        <div className="product-summary">
          <p className="eyebrow">Product</p>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
          {item.price ? (
            <p className="price">
              {item.currency} {item.price}
            </p>
          ) : null}
          <div className="action-row">
            <Link className="button primary" href="/pages/contact-us">
              Request Quote
            </Link>
            <a className="button secondary" href={item.url}>
              Original Page
            </a>
          </div>
        </div>
      </section>
      <LegacyContent item={item} />
      <ProductGrid title="Related Products" items={related} />
    </main>
  );
}

function RallyCategoryPage({ item, design }: { item: SiteItem; design: CategoryDesign }) {
  return (
    <main className="rally-category">
      <RallySiteNav dark />

      <section className="rally-category-hero">
        <img className="rally-category-hero-image" src={design.heroImage} alt="" />
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
          <p>{item.description || "Shop CHEERDMOTO products by model, power, and riding style."}</p>
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
                  <img src={product.image} alt={product.name} />
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
        <img src={design.ctaImage} alt="" />
        <div>
          <span>{design.label}</span>
          <h2>{design.ctaTitle}</h2>
          <p>{design.ctaCopy}</p>
          <Link className="rally-btn" href="/pages/contact-us">
            ASK AN EXPERT
          </Link>
        </div>
      </section>

      <footer className="rally-footer">
        <div>
          <strong>CHEERDMOTO</strong>
          <p>Electric mobility equipment for performance, utility and everyday independence.</p>
        </div>
        <div>
          <h3>SHOP</h3>
          <Link href="/collections/electric-dirt-bikes">Dirt Bike</Link>
          <Link href="/collections/electric-bikes">E Bike</Link>
          <Link href="/collections/e-wheelchairs">Wheelchair</Link>
        </div>
        <div>
          <h3>SUPPORT</h3>
          <Link href="/pages/contact-us">Contact us</Link>
          <Link href="/pages/shipping-returns">Shipping & returns</Link>
          <Link href="/pages/return-warranty-policy">Warranty</Link>
        </div>
        <div>
          <h3>COMPANY</h3>
          <Link href="/pages/about-us">About us</Link>
          <Link href="/blogs/electric-dirt-bike-guides">Blog</Link>
          <Link href="/pages/business-partner">B2B customer</Link>
        </div>
      </footer>
    </main>
  );
}

function CollectionPage({ item }: { item: SiteItem }) {
  const design = categoryDesigns[item.route];

  if (design) {
    return <RallyCategoryPage item={item} design={design} />;
  }

  const products = siteData.products.filter((product) => {
    const text = `${product.title} ${product.description}`.toLowerCase();
    const slug = item.slug.replace(/-/g, " ");
    return text.includes(slug.split(" ")[0]) || item.slug === "all-products";
  });

  return (
    <main>
      <PageHero item={item} label="Collection" />
      <ProductGrid title={item.title} items={products.length ? products : siteData.products.slice(0, 12)} />
      <LegacyContent item={item} compact />
    </main>
  );
}

function ContentPage({ item }: { item: SiteItem }) {
  return (
    <main>
      <PageHero item={item} label={item.kind === "article" ? "Article" : "Page"} />
      <LegacyContent item={item} />
      <CardGrid title="Explore More" items={relatedItems(item)} />
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

function LegacyContent({ item, compact = false }: { item: SiteItem; compact?: boolean }) {
  if (!item.html) return null;

  return (
    <section className={compact ? "legacy-content compact" : "legacy-content"}>
      <div dangerouslySetInnerHTML={{ __html: item.html }} />
    </section>
  );
}

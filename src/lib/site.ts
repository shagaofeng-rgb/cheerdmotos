import rawData from "@/data/site-data.json";
import type { SiteData, SiteItem } from "@/types";

const localProductImages: Record<string, string> = {
  "xceed-electric-dirt-bike": "/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png",
  "cheerdmoto-performance-96v-electric-dirtbike-xtreme": "/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xtreme_transparent.png",
  "cheerdmoto-electric-wheelchair-smart-b02": "/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/smart_b02_transparent.png",
  "grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto": "/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xplore_transparent.png",
  "grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto": "/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xcite_transparent.png",
  "grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike": "/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xplus_transparent.png"
};

function cleanItem(item: SiteItem): SiteItem {
  return {
    ...item,
    url: item.route,
    image: item.kind === "product" ? localProductImages[item.slug] || "" : "",
    html: ""
  };
}

function cleanSiteData(data: SiteData): SiteData {
  const rawProducts = data.products.filter((item) => item.route.startsWith("/products/")).map(cleanItem);
  const selectedProductSlugs = new Set([
    "xceed-electric-dirt-bike",
    "cheerdmoto-performance-96v-electric-dirtbike-xtreme",
    "cheerdmoto-electric-wheelchair-smart-b02",
    "grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto",
    "grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto",
    "grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike",
    "helmet",
    "cheerdmoto-xceed-upgraded-high-temperature-performance-brake-upgrade-kit",
    "xceed-street-legal-kit",
    "cheerdmoto-xceed-lcd-display-with-mount-bracket",
    "cheerdmoto-xceed-72v-30ah-battery",
    "cheerdmoto-xceed-dirtbike-wheel-upgrade-kit"
  ]);
  const products = rawProducts.filter((item) => selectedProductSlugs.has(item.slug));
  const collections = [
    { route: "/electric-dirt-bikes", title: "Electric Dirt Bikes", slug: "electric-dirt-bikes", description: "High-output electric dirt bikes built for trail, enduro, and off-road riders." },
    { route: "/e-bikes", title: "E Bikes", slug: "e-bikes", description: "Fat tire electric bikes for daily rides, errands, and all-road utility." },
    { route: "/electric-wheelchairs", title: "Electric Wheelchairs", slug: "electric-wheelchairs", description: "Compact electric mobility platforms for independence and everyday travel." },
    { route: "/accessories", title: "Accessories", slug: "accessories", description: "Parts, batteries, rider gear, and model-specific service accessories." },
    { route: "/clearance", title: "Refurbished & Clearance", slug: "clearance", description: "Inspected clearance products and limited-availability deals." },
    { route: "/products", title: "All Products", slug: "products", description: "Browse CHEERDMOTO electric dirt bikes, e-bikes, mobility products, and accessories." }
  ].map((item) => cleanItem({
    url: item.route,
    route: item.route,
    slug: item.slug,
    kind: "collection",
    title: item.title,
    description: item.description,
    image: "",
    price: "",
    currency: "USD",
    availability: "",
    publishedAt: "",
    html: ""
  }));
  const pages = [
    { route: "/support", title: "Support", slug: "support", description: "Contact CHEERDMOTO support for product, order, warranty, and dealer questions." },
    { route: "/about", title: "About CHEERDMOTO", slug: "about", description: "CHEERDMOTO builds electric mobility products for performance, utility, and everyday independence." },
    { route: "/dealer-program", title: "Dealer Program", slug: "dealer-program", description: "Apply for dealer, fleet, and B2B buying support." },
    { route: "/rider-club", title: "Rider Club", slug: "rider-club", description: "Join the CHEERDMOTO rider community." },
    { route: "/product-registration", title: "Product Registration", slug: "product-registration", description: "Register your CHEERDMOTO product for service and support." },
    { route: "/manuals", title: "Manuals & Assembly", slug: "manuals", description: "Find setup, assembly, and maintenance guidance." },
    { route: "/warranty", title: "Warranty Policy", slug: "warranty", description: "Review CHEERDMOTO warranty coverage and service terms." },
    { route: "/shipping-returns", title: "Shipping & Returns", slug: "shipping-returns", description: "Review shipping, delivery, returns, and after-sales support policies." },
    { route: "/discover", title: "Discover", slug: "discover", description: "CHEERDMOTO product guides, rider resources, and company updates." }
  ].map((item) => cleanItem({
    url: item.route,
    route: item.route,
    slug: item.slug,
    kind: "page",
    title: item.title,
    description: item.description,
    image: "",
    price: "",
    currency: "USD",
    availability: "",
    publishedAt: "",
    html: ""
  }));
  const home = cleanItem({
    ...(data.home || data.items.find((item) => item.route === "/") || pages[0]),
    url: "/",
    route: "/",
    image: "",
    html: ""
  });
  return {
    generatedAt: data.generatedAt,
    origin: "https://www.cheerdmotos.com",
    navigation: [],
    products,
    collections,
    pages,
    blogs: [],
    articles: [],
    home,
    items: [home, ...collections, ...products, ...pages]
  };
}

export const siteData = cleanSiteData(rawData as SiteData);

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cheerdmotos.com";
export const siteUrl = configuredSiteUrl.replace(/^http:\/\//, "https://").replace(/\/$/, "");

export const productSlugs = [
  "xceed-electric-dirt-bike",
  "cheerdmoto-performance-96v-electric-dirtbike-xtreme",
  "cheerdmoto-electric-wheelchair-smart-b02",
  "grandeux-xplore-electric-bike-1350w-over-frame-fat-tire-ebike-cheerdmoto",
  "grandeux-xcite-electric-bike-1350w-step-thru-fat-tire-ebike-cheerdmoto",
  "grandeux-xplus-electric-moped-bike-1350w-fat-tire-e-bike",
  "helmet",
  "cheerdmoto-xceed-upgraded-high-temperature-performance-brake-upgrade-kit",
  "xceed-street-legal-kit",
  "cheerdmoto-xceed-lcd-display-with-mount-bracket",
  "cheerdmoto-xceed-72v-30ah-battery",
  "cheerdmoto-xceed-dirtbike-wheel-upgrade-kit"
] as const;

export type ProductSlug = (typeof productSlugs)[number];
export const oneTimePaymentSlug = "one-time-35" as const;
export const checkoutProductSlugs = [...productSlugs, "payment-test", oneTimePaymentSlug] as const;
export type CheckoutProductSlug = (typeof checkoutProductSlugs)[number];

export type ProductSpecRow = {
  label: string;
  value: string;
};

type CatalogProduct = {
  name: string;
  image: string;
  thumbnail: string;
  category: string;
  price: string;
  priceAmount: number;
  specs: string[];
};

function priceAmount(value: string) {
  const parsed = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function productCategory(item: SiteItem) {
  const route = item.route.toLowerCase();
  if (route.includes("wheelchair")) return "Electric Wheelchair";
  if (route.includes("helmet") || route.includes("kit") || route.includes("battery") || route.includes("display")) return "Accessories";
  if (route.includes("bike") && !route.includes("dirt")) return "E Bike";
  return "Electric Dirt Bike";
}

function catalogProduct(slug: string): CatalogProduct {
  const item = siteData.products.find((entry) => entry.slug === slug);
  if (!item) {
    return {
      name: "CHEERDMOTO Payment Item",
      image: "/favicon.ico",
      thumbnail: "/favicon.ico",
      category: "Payment",
      price: "USD 0",
      priceAmount: 0,
      specs: ["Custom order", "Sales confirmation", "Secure checkout", "USD"]
    };
  }
  const amount = priceAmount(item.price);
  return {
    name: item.title.replace(/\s*\|\s*CheerdMoto.*$/i, ""),
    image: item.image || "/favicon.ico",
    thumbnail: item.image || "/favicon.ico",
    category: productCategory(item),
    price: `USD ${amount.toLocaleString()}`,
    priceAmount: amount,
    specs: [item.availability || "Available", item.currency || "USD", productCategory(item), "CHEERDMOTO"]
  };
}

export const products = {
  ...Object.fromEntries(productSlugs.map((slug) => [slug, catalogProduct(slug)])),
  "payment-test": {
    name: "CHEERDMOTO Payment Gateway Test Product",
    image: siteData.products[0]?.image || "/favicon.ico",
    thumbnail: siteData.products[0]?.image || "/favicon.ico",
    category: "Payment Test",
    price: "USD 10",
    priceAmount: 10,
    specs: ["Test order", "No shipment", "Gateway check", "USD 10"]
  },
  "one-time-35": {
    name: "CHEERDMOTO One-Time Payment Link",
    image: siteData.products[0]?.image || "/favicon.ico",
    thumbnail: siteData.products[0]?.image || "/favicon.ico",
    category: "One-Time Payment",
    price: "USD 35",
    priceAmount: 35,
    specs: ["One-time payment", "Formal collection", "No shipment", "USD 35"]
  }
} as Record<CheckoutProductSlug, CatalogProduct>;

export const productDetailedSpecs = Object.fromEntries(
  productSlugs.map((slug) => [
    slug,
    [
      { label: "Model", value: products[slug].name },
      { label: "Category", value: products[slug].category },
      { label: "Price", value: products[slug].price },
      { label: "Availability", value: products[slug].specs[0] || "Available" }
    ]
  ])
) as Record<ProductSlug, ProductSpecRow[]>;

export function itemByRoute(route: string): SiteItem | undefined {
  const normalized = route === "" ? "/" : route.replace(/\/$/, "") || "/";
  if (normalized === "/") return siteData.home || siteData.items.find((item) => item.route === "/");
  return siteData.items.find((item) => item.route === normalized);
}

export function routeFromSegments(slug?: string[]): string {
  if (!slug?.length) return "/";
  return `/${slug.join("/")}`;
}

export function segmentsFromRoute(route: string): string[] {
  return route === "/" ? [] : route.split("/").filter(Boolean);
}

export function featuredProducts(limit = 6): SiteItem[] {
  return siteData.products
    .filter((product) => product.image)
    .slice(0, limit);
}

export function relatedItems(item: SiteItem, limit = 4): SiteItem[] {
  const pool =
    item.kind === "article"
      ? siteData.articles
      : item.kind === "product"
        ? siteData.products
        : [...siteData.products, ...siteData.articles];

  return pool.filter((entry) => entry.route !== item.route).slice(0, limit);
}

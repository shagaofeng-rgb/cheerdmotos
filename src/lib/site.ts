import rawData from "@/data/site-data.json";
import type { SiteData, SiteItem } from "@/types";

export const siteData = rawData as SiteData;

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cheerdmotos.com";
export const siteUrl = configuredSiteUrl.replace(/^https:\/\/www\./, "https://").replace(/\/$/, "");

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

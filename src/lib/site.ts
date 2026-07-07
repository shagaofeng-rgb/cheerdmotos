import rawData from "@/data/site-data.json";
import type { SiteData, SiteItem } from "@/types";

export const siteData = rawData as SiteData;

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

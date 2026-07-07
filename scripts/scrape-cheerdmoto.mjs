import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const ORIGIN = "https://cheerdmoto.com";
const OUT_DIR = path.join(process.cwd(), "src", "data");
const ASSET_DIR = path.join(process.cwd(), "public", "legacy-assets");

const decodeXml = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const cleanText = (value = "") => value.replace(/\s+/g, " ").trim();

const normalizeUrl = (value) => {
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("http://cdn.shopify.com")) return value.replace("http://", "https://");
  if (value.startsWith("/")) return `${ORIGIN}${value}`;
  return value;
};

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Cheerdmoto Next.js migration crawler"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return res.text();
}

function locs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeXml(match[1]));
}

function contentHtml($) {
  const candidates = [
    "main .shopify-section",
    "main article",
    "main",
    "#MainContent",
    ".main-content"
  ];

  let html = "";
  for (const selector of candidates) {
    const el = $(selector).first();
    if (el.length && cleanText(el.text()).length > 120) {
      html = el.html() || "";
      break;
    }
  }

  const fragment = cheerio.load(`<div id="root">${html}</div>`);
  fragment("script, style, noscript, iframe, svg").remove();
  fragment("[data-section-id], [data-section-type]").removeAttr("data-section-id data-section-type");
  fragment("img").each((_, img) => {
    const el = fragment(img);
    const src = normalizeUrl(el.attr("src") || el.attr("data-src") || el.attr("data-original"));
    if (src) el.attr("src", src);
    el.removeAttr("srcset sizes loading width height");
  });
  fragment("a").each((_, link) => {
    const el = fragment(link);
    const href = el.attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (href.startsWith(ORIGIN)) el.attr("href", href.replace(ORIGIN, ""));
    if (href.startsWith("/")) return;
    if (href.startsWith("//")) el.attr("href", `https:${href}`);
  });

  return fragment("#root").html() || "";
}

function jsonLdObjects($) {
  const objects = [];
  $('script[type="application/ld+json"]').each((_, script) => {
    const raw = $(script).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) objects.push(...parsed);
      else objects.push(parsed);
    } catch {
      // Ignore malformed third-party JSON-LD blocks.
    }
  });
  return objects;
}

function pickImage($, jsonLd) {
  const fromJson = jsonLd
    .flatMap((item) => {
      if (!item) return [];
      const image = item.image;
      if (Array.isArray(image)) return image;
      return image ? [image] : [];
    })
    .map((item) => (typeof item === "string" ? item : item?.url))
    .filter(Boolean)[0];

  return normalizeUrl(
    fromJson ||
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $("main img").first().attr("src") ||
      ""
  );
}

function slugFromUrl(url) {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  return parts.at(-1) || "home";
}

function kindFromUrl(url) {
  const { pathname } = new URL(url);
  if (pathname === "/") return "home";
  if (pathname.startsWith("/products/")) return "product";
  if (pathname.startsWith("/collections/")) return "collection";
  if (pathname.startsWith("/pages/")) return "page";
  if (pathname.startsWith("/blogs/") && pathname.split("/").filter(Boolean).length > 2) return "article";
  if (pathname.startsWith("/blogs/")) return "blog";
  return "page";
}

function routeFromUrl(url) {
  const pathname = new URL(url).pathname;
  return pathname === "/" ? "/" : pathname.replace(/\/$/, "");
}

function extractItem(url, html) {
  const $ = cheerio.load(html);
  const jsonLd = jsonLdObjects($);
  const product = jsonLd.find((item) => item?.["@type"] === "Product");
  const article = jsonLd.find((item) => ["Article", "BlogPosting"].includes(item?.["@type"]));
  const kind = kindFromUrl(url);
  const title =
    product?.name ||
    article?.headline ||
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text() ||
    $("title").text();
  const description =
    product?.description ||
    article?.description ||
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const offers = product?.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;

  return {
    url,
    route: routeFromUrl(url),
    slug: slugFromUrl(url),
    kind,
    title: cleanText(title).replace(/\s*\|\s*Cheerdmoto\s*$/i, ""),
    description: cleanText(description),
    image: pickImage($, jsonLd),
    price: offer?.price ? String(offer.price) : "",
    currency: offer?.priceCurrency || "",
    availability: offer?.availability || "",
    publishedAt: article?.datePublished || "",
    html: contentHtml($)
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(ASSET_DIR, { recursive: true });

  const sitemap = await fetchText(`${ORIGIN}/sitemap.xml`);
  const sitemapUrls = locs(sitemap).filter((url) => !url.includes("/en-au/"));
  const discovered = new Set([ORIGIN]);

  for (const sitemapUrl of sitemapUrls) {
    const xml = await fetchText(sitemapUrl);
    for (const url of locs(xml)) {
      if (!url.includes("/en-au/") && url.startsWith(ORIGIN)) {
        discovered.add(url.replace(/\/$/, "") || ORIGIN);
      }
    }
  }

  const urls = [...discovered].filter((url) => !url.endsWith("/agents.md"));
  const items = [];

  for (const [index, url] of urls.entries()) {
    process.stdout.write(`[${index + 1}/${urls.length}] ${url}\n`);
    try {
      const html = await fetchText(url);
      items.push(extractItem(url, html));
    } catch (error) {
      console.error(`Skipped ${url}: ${error.message}`);
    }
  }

  const byKind = (kind) => items.filter((item) => item.kind === kind);
  const data = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    navigation: [
      { label: "Electric Dirt Bikes", href: "/collections/electric-dirt-bikes" },
      { label: "Electric Bikes", href: "/collections/electric-bikes" },
      { label: "E-Wheelchairs", href: "/collections/e-wheelchairs" },
      { label: "Parts", href: "/collections/parts-and-accessories" },
      { label: "About", href: "/pages/about-us" },
      { label: "Contact", href: "/pages/contact-us" }
    ],
    products: byKind("product"),
    collections: byKind("collection"),
    pages: byKind("page"),
    blogs: byKind("blog"),
    articles: byKind("article"),
    home: items.find((item) => item.kind === "home") || null,
    items
  };

  await writeFile(path.join(OUT_DIR, "site-data.json"), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${items.length} pages to src/data/site-data.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

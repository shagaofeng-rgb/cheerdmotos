export type SiteItemKind = "home" | "product" | "collection" | "page" | "blog" | "article";

export type SiteItem = {
  url: string;
  route: string;
  slug: string;
  kind: SiteItemKind;
  title: string;
  description: string;
  image: string;
  price: string;
  currency: string;
  availability: string;
  publishedAt: string;
  html: string;
};

export type SiteData = {
  generatedAt: string;
  origin: string;
  navigation: Array<{ label: string; href: string }>;
  products: SiteItem[];
  collections: SiteItem[];
  pages: SiteItem[];
  blogs: SiteItem[];
  articles: SiteItem[];
  home: SiteItem | null;
  items: SiteItem[];
};

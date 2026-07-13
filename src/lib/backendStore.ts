import path from 'node:path';
import {newsArticles} from '@/lib/news';
import {products, productSlugs, type ProductSlug} from '@/lib/site';
import {readAnalyticsEvents, readStoreOrders, type AnalyticsEvent, type StoreOrder} from '@/lib/commerceStore';
import {readStoreObject, writeStoreObject} from '@/lib/durableStore';
import {classifyTraffic, type AttributionSnapshot} from '@/lib/trafficAttribution';

const STORE_FILE = 'admin-store.json';

export type PublishStatus = 'draft' | 'published' | 'unpublished' | 'scheduled' | 'archived';
export type ContentType = 'blog' | 'news';

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  status: PublishStatus;
  parentId: string;
  updatedAt: string;
};

export type AdminProduct = {
  id: string;
  slug: ProductSlug | string;
  name: string;
  categorySlug: string;
  categoryName: string;
  coverImage: string;
  galleryImages: string[];
  shortDescription: string;
  fullDescription: string;
  keyFeatures: string[];
  specifications: {label: string; value: string}[];
  applicationScenarios: string[];
  priceCents: number;
  salePriceCents: number;
  currency: 'USD';
  sku: string;
  stock: number;
  moq: number;
  weightDimension: string;
  shippingInfo: string;
  seoTitle: string;
  seoDescription: string;
  status: PublishStatus;
  sortOrder: number;
  showOnHome: boolean;
  allowCart: boolean;
  allowDirectOrder: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MediaAsset = {
  id: string;
  fileName: string;
  url: string;
  alt: string;
  mimeType: string;
  sizeBytes: number;
  usage: string[];
  createdAt: string;
};

export type ContentPost = {
  id: string;
  type: ContentType;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  content: string;
  publishDate: string;
  author: string;
  source: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  geoSummary?: string;
  productSlugs?: string[];
  sourceName?: string;
  sourceUrl?: string;
  canonicalSourceUrl?: string;
  sourcePublishedAt?: string;
  collectedAt?: string;
  sourceFetchedAt?: string;
  sourceTimezone?: string;
  originalTitle?: string;
  originalLanguage?: string;
  normalizedTitle?: string;
  sourceFingerprint?: string;
  eventFingerprint?: string;
  contentHash?: string;
  credibilityScore?: number;
  productRelations?: {slug: string; score: number; reason: string}[];
  imageAlt?: string;
  imageSourceUrl?: string;
  imageCredit?: string;
  relevanceScore?: number;
  retryCount?: number;
  status: PublishStatus | 'scheduled';
  createdAt: string;
  updatedAt: string;
};

export type SiteSettings = {
  companyName: string;
  adminNotificationEmail: string;
  contactEmail: string;
  whatsapp: string;
  address: string;
  paymentCurrency: string;
  qianhaiStatus: string;
  cookieConsentReady: boolean;
  updatedAt: string;
};

export type AdminStore = {
  categories: AdminCategory[];
  products: AdminProduct[];
  media: MediaAsset[];
  posts: ContentPost[];
  settings: SiteSettings;
};

export type CustomerLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  source: string;
  status: 'New Lead' | 'Contact Captured' | 'Order Created' | 'Payment Pending' | 'Paid' | 'Abandoned';
  interestedProducts: string[];
  cartItems: string[];
  lastActiveTime: string;
  trafficSource: string;
  notes: string;
};

export type AdminDashboardFilter = {
  from?: Date;
  to?: Date;
};

function now() {
  return new Date().toISOString();
}

function cents(amount: number) {
  return Math.round(amount * 100);
}

export async function readAdminStore() {
  const stored = await readStoreObject<AdminStore>(STORE_FILE);
  if (stored) {
    const synced = syncCatalogPrices(stored);
    if (synced.changed) {
      await writeStoreObject(STORE_FILE, synced.store);
      return synced.store;
    }
    return stored;
  }
  const seeded = createSeedStore();
  await writeStoreObject(STORE_FILE, seeded);
  return seeded;
}

function syncCatalogPrices(store: AdminStore) {
  let changed = false;
  const timestamp = now();
  const updatedProducts = store.products.map((product) => {
    if (!productSlugs.includes(product.slug as ProductSlug)) return product;
    const slug = product.slug as ProductSlug;
    const siteProduct = products[slug];
    const nextPriceCents = cents(siteProduct.priceAmount);
    if (product.priceCents === nextPriceCents && product.salePriceCents === 0) return product;
    changed = true;
    return {
      ...product,
      priceCents: nextPriceCents,
      salePriceCents: 0,
      updatedAt: timestamp
    };
  });
  return {changed, store: changed ? {...store, products: updatedProducts} : store};
}

export async function writeAdminStore(updater: (store: AdminStore) => AdminStore) {
  const current = await readAdminStore();
  const next = updater(current);
  await writeStoreObject(STORE_FILE, next);
  return next;
}

export async function listAdminProducts() {
  return (await readAdminStore()).products.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listAdminCategories() {
  return (await readAdminStore()).categories.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listAdminMedia() {
  return (await readAdminStore()).media.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAdminPosts(type?: ContentType) {
  const posts = (await readAdminStore()).posts;
  return posts.filter((post) => !type || post.type === type).sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

function isInsideRange(timestamp: string, filter?: AdminDashboardFilter) {
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  if (filter?.from && time < filter.from.getTime()) return false;
  if (filter?.to && time > filter.to.getTime()) return false;
  return true;
}

export async function getAdminDashboardData(filter?: AdminDashboardFilter) {
  const [store, orders, events] = await Promise.all([readAdminStore(), readStoreOrders(), readAnalyticsEvents()]);
  const filteredOrders = orders.filter((order) => isInsideRange(order.createdAt, filter));
  const filteredEvents = events.filter((event) => isInsideRange(event.timestamp, filter));
  const leads = buildCustomerLeads(filteredOrders, filteredEvents);
  const paidOrders = filteredOrders.filter((order) => ['paid', 'processing', 'shipped', 'delivered'].includes(order.status));
  const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const productViews = filteredEvents.filter((event) => event.type === 'product_view').length;
  const checkoutEvents = filteredEvents.filter((event) => /checkout|order|payment/i.test(event.type)).length;
  return {
    store,
    metrics: {
      products: store.products.length,
      publishedProducts: store.products.filter((product) => product.status === 'published').length,
      posts: store.posts.length,
      orders: filteredOrders.length,
      paidOrders: paidOrders.length,
      leads: leads.length,
      revenue,
      visitors: new Set(filteredEvents.map((event) => event.visitorId)).size,
      pageViews: filteredEvents.filter((event) => event.type === 'page_view').length,
      productViews,
      checkoutEvents,
      conversionRate: filteredEvents.length ? Math.round((filteredOrders.length / Math.max(1, new Set(filteredEvents.map((event) => event.visitorId)).size)) * 1000) / 10 : 0
    },
    orders: filteredOrders.slice(-12).reverse(),
    events: filteredEvents.slice(-24).reverse(),
    leads,
    funnel: buildFunnel(filteredEvents, filteredOrders),
    popularProducts: countBy([...filteredOrders.map((order) => order.productName), ...filteredEvents.map((event) => String(event.payload?.productSlug || '')).filter(Boolean)]),
    trafficSources: countBy(filteredEvents.map((event) => trafficSourceLabel(event))),
    countries: countBy([...filteredOrders.map((order) => order.customer.country), ...filteredEvents.map((event) => event.country)])
  };
}

function trafficSourceLabel(event: AnalyticsEvent) {
  const attribution = event.attribution as AttributionSnapshot | null | undefined;
  const touch = attribution?.lastTouch || classifyTraffic({url: event.page, referrer: event.referrer});
  return `${touch.source || 'direct'} / ${touch.channel || 'direct'}`;
}

export function buildCustomerLeads(orders: StoreOrder[], events: AnalyticsEvent[]): CustomerLead[] {
  const orderLeads = orders.map((order) => ({
    id: order.id,
    name: order.customer.name || `${order.checkout.firstName} ${order.checkout.lastName}`.trim() || '未知客户',
    email: order.customer.email || order.checkout.contact,
    phone: order.customer.phone,
    country: order.customer.country,
    company: order.customer.company,
    source: 'checkout',
    status: order.status === 'pending_payment' ? 'Payment Pending' as const : order.status === 'paid' ? 'Paid' as const : 'Order Created' as const,
    interestedProducts: [order.productName],
    cartItems: [`${order.productName} x ${order.quantity}`],
    lastActiveTime: order.updatedAt || order.createdAt,
    trafficSource: '网站结账',
    notes: order.customer.message || order.logisticsStatus
  }));
  const visitorIdsWithOrder = new Set(orders.map((order) => order.id));
  const checkoutEvents = events.filter((event) => /checkout|commerce_click|contact/i.test(event.type) && !visitorIdsWithOrder.has(event.sessionId));
  const eventLeads = checkoutEvents.slice(-30).reverse().map((event) => {
    const payload = event.payload || {};
    const isInquiry = event.type === 'contact_inquiry';
    const product = String(payload.product || payload.productSlug || event.page || '').trim();
    const message = String(payload.message || '').trim();
    return {
      id: event.id,
      name: String(payload.name || (isInquiry ? 'Contact Inquiry' : '匿名访客')),
      email: String(payload.email || ''),
      phone: String(payload.phone || ''),
      country: String(payload.country || event.country || ''),
      company: String(payload.company || ''),
      source: event.type,
      status: event.type.includes('checkout') ? 'Abandoned' as const : isInquiry ? 'Contact Captured' as const : 'New Lead' as const,
      interestedProducts: [product].filter(Boolean),
      cartItems: [],
      lastActiveTime: event.timestamp,
      trafficSource: event.referrer || '直接访问',
      notes: message || `最后访问页面：${event.page}`
    };
  });
  return [...orderLeads, ...eventLeads].sort((a, b) => b.lastActiveTime.localeCompare(a.lastActiveTime));
}

function buildFunnel(events: AnalyticsEvent[], orders: StoreOrder[]) {
  const pageVisitors = new Set(events.map((event) => event.visitorId)).size;
  const productViewers = new Set(events.filter((event) => event.type === 'product_view').map((event) => event.visitorId)).size;
  const checkoutStarters = new Set(events.filter((event) => /checkout_start|begin_checkout|commerce_click/.test(event.type)).map((event) => event.visitorId)).size;
  const orderCount = orders.length;
  const paymentStarted = orders.filter((order) => order.gatewayStatus === 'pending' || order.gatewayStatus === 'success').length;
  const paid = orders.filter((order) => ['paid', 'processing', 'shipped', 'delivered'].includes(order.status)).length;
  return [
    {label: '访问网站', value: pageVisitors},
    {label: '浏览产品', value: productViewers},
    {label: '进入结账', value: checkoutStarters},
    {label: '创建订单', value: orderCount},
    {label: '发起支付', value: paymentStarted},
    {label: '完成支付', value: paid}
  ].map((row, index, rows) => ({
    ...row,
    conversion: index === 0 ? 100 : rows[index - 1].value ? Math.round((row.value / rows[index - 1].value) * 1000) / 10 : 0
  }));
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()].map(([label, value]) => ({label, value})).sort((a, b) => b.value - a.value).slice(0, 10);
}

function createSeedStore(): AdminStore {
  const createdAt = now();
  const categoryNames = [...new Set(productSlugs.map((slug) => products[slug].category))];
  const productGalleryImages = Object.fromEntries(productSlugs.map((slug) => [slug, [products[slug].image]])) as Record<ProductSlug, string[]>;
  const categories = categoryNames.map((name, index) => ({
    id: `cat-${index + 1}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: `CHEERDMOTO ${name} catalog category for retail buyers, dealers and fleet customers.`,
    coverImage: products[productSlugs[index] || productSlugs[0]].image,
    seoTitle: `${name} Supplier | CHEERDMOTO`,
    seoDescription: `Browse CHEERDMOTO ${name} products for electric mobility, off-road riding, commuters and dealers.`,
    sortOrder: index + 1,
    status: 'published' as const,
    parentId: '',
    updatedAt: createdAt
  }));
  const adminProducts = productSlugs.map((slug, index) => {
    const product = products[slug];
    const category = categories.find((item) => item.name === product.category);
    return {
      id: `prod-${slug}`,
      slug,
      name: product.name,
      categorySlug: category?.slug || '',
      categoryName: product.category,
      coverImage: product.image,
      galleryImages: productGalleryImages[slug],
      shortDescription: `${product.name} for electric mobility customers, dealers, fleet buyers and direct online orders.`,
      fullDescription: `${product.name} is connected to the CHEERDMOTO backend for specs, applications, pricing, inventory and SEO management.`,
      keyFeatures: product.specs,
      specifications: product.specs.map((value, specIndex) => ({label: ['Power/System', 'Battery/Voltage', 'Speed', 'Endurance/Feature'][specIndex] || `Spec ${specIndex + 1}`, value})),
      applicationScenarios: ['Retail buyers', 'Dealers', 'Fleet programs', 'Outdoor riders', 'Mobility customers'],
      priceCents: cents(product.priceAmount),
      salePriceCents: 0,
      currency: 'USD' as const,
      sku: `CM-${String(slug).toUpperCase()}`,
      stock: 20,
      moq: 1,
      weightDimension: 'Confirmed by model and shipping package.',
      shippingInfo: 'Shipping cost is confirmed by destination, quantity and carrier.',
      seoTitle: `${product.name} | CHEERDMOTO`,
      seoDescription: `${product.name} for direct buyers, dealers, fleets and electric mobility projects.`,
      status: 'published' as const,
      sortOrder: index + 1,
      showOnHome: index < 3,
      allowCart: true,
      allowDirectOrder: true,
      createdAt,
      updatedAt: createdAt
    };
  });
  const media = adminProducts.flatMap((product) => product.galleryImages.map((url, index) => ({
    id: `media-${product.slug}-${index + 1}`,
    fileName: path.basename(url),
    url,
    alt: `${product.name} image ${index + 1}`,
    mimeType: 'image/png',
    sizeBytes: 0,
    usage: [product.name],
    createdAt
  })));
  const posts = newsArticles.map((article, index) => ({
    id: `post-${article.slug}`,
    type: index === 0 ? 'news' as const : 'blog' as const,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    coverImage: article.hero,
    category: article.tags[0] || 'Water Sports',
    content: article.body.map((section) => `## ${section.heading}\n\n${section.paragraphs.join('\n\n')}`).join('\n\n'),
    publishDate: article.date,
    author: 'CHEERDMOTO Editorial Team',
    source: article.sources.map((source) => `${source.name}: ${source.url}`).join('\n'),
    tags: article.tags,
    seoTitle: `${article.title} | CHEERDMOTO`,
    seoDescription: article.excerpt,
    status: 'published' as const,
    createdAt,
    updatedAt: createdAt
  }));
  return {
    categories,
    products: adminProducts,
    media,
    posts,
    settings: {
      companyName: 'CHEERDMOTO',
      adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'support@cheerdmotos.com',
      contactEmail: 'support@cheerdmotos.com',
      whatsapp: '+86 17621485205',
      address: 'CHEERDMOTO sales office',
      paymentCurrency: 'USD',
      qianhaiStatus: process.env.QIANHAI_MERCHANT_ID ? '已配置' : '等待前海通道参数',
      cookieConsentReady: false,
      updatedAt: createdAt
    }
  };
}

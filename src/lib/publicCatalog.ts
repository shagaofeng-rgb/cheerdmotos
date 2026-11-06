import {cache} from 'react';
import type {AdminProduct} from '@/lib/backendStore';
import {listAdminProducts} from '@/lib/backendStore';
import {readStoreOrders, type StoreOrder} from '@/lib/commerceStore';
import {catalogOffer} from '@/lib/purchaseCatalog';
import type {SiteItem} from '@/types';

export const listPublishedCatalog = cache(async () => (await listAdminProducts()).filter((product) => product.status === 'published'));

export function publicProductItem(product: AdminProduct, orders: readonly StoreOrder[] = []): SiteItem {
  const offer = catalogOffer(product, orders);
  return {
    url: `/products/${product.slug}`,
    route: `/products/${product.slug}`,
    slug: product.slug,
    kind: 'product',
    title: product.name,
    description: product.shortDescription || product.fullDescription,
    image: product.coverImage || product.galleryImages[0] || '',
    price: offer.priceCents > 0 ? `USD ${(offer.priceCents / 100).toLocaleString('en-US', {maximumFractionDigits: 2})}` : '',
    currency: product.currency,
    categorySlug: product.categorySlug,
    sku: product.sku,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    specifications: product.specifications,
    availability: offer.available > 0 ? 'InStock' : 'OutOfStock',
    offer: {priceCents: offer.priceCents, available: offer.available, canCart: offer.canCart, canDirectOrder: offer.canDirectOrder},
    publishedAt: product.updatedAt || product.createdAt,
    html: ''
  };
}

export const listPublicProducts = cache(async () => {
  const [products, orders] = await Promise.all([listPublishedCatalog(), readStoreOrders()]);
  return products.map((product) => publicProductItem(product, orders));
});

export const getPublicProductBySlug = cache(async (slug: string) =>
  (await listPublicProducts()).find((item) => item.slug === slug) || null
);

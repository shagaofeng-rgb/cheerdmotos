import type {AdminProduct} from '@/lib/backendStore';
import {listAdminProducts} from '@/lib/backendStore';
import type {SiteItem} from '@/types';

function price(product: AdminProduct) {
  const cents = product.salePriceCents || product.priceCents;
  return cents > 0 ? `USD ${(cents / 100).toLocaleString('en-US', {maximumFractionDigits: 2})}` : '';
}

export function publicProductItem(product: AdminProduct): SiteItem {
  return {
    url: `/products/${product.slug}`,
    route: `/products/${product.slug}`,
    slug: product.slug,
    kind: 'product',
    title: product.name,
    description: product.shortDescription || product.fullDescription,
    image: product.coverImage || product.galleryImages[0] || '',
    price: price(product),
    currency: product.currency,
    availability: product.stock > 0 ? 'InStock' : 'OutOfStock',
    publishedAt: product.updatedAt || product.createdAt,
    html: ''
  };
}

export async function listPublicProducts() {
  return (await listAdminProducts())
    .filter((product) => product.status === 'published')
    .map(publicProductItem);
}

export async function getPublicProductBySlug(slug: string) {
  const product = (await listAdminProducts()).find((item) => item.slug === slug && item.status === 'published');
  return product ? publicProductItem(product) : null;
}

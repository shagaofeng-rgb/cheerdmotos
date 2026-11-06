import {listAdminProducts} from '@/lib/backendStore';
import {stockBreakdown} from '@/lib/inventory';
import {oneTimePaymentSlug, products} from '@/lib/site';
import type {AdminProduct} from '@/lib/backendStore';
import type {StoreOrder} from '@/lib/commerceStore';

export type PurchaseSource = 'direct' | 'cart';

export function isSpecialPayment(slug: string): slug is typeof oneTimePaymentSlug | 'payment-test' {
  return slug === oneTimePaymentSlug || slug === 'payment-test';
}

export function catalogPriceCents(product: AdminProduct) {
  const cents = product.salePriceCents || product.priceCents;
  return Number.isSafeInteger(cents) && cents > 0 ? cents : 0;
}

export function catalogOffer(product: AdminProduct, orders: readonly StoreOrder[]) {
  const priceCents = catalogPriceCents(product);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    image: product.coverImage || product.galleryImages[0] || '',
    priceCents,
    currency: product.currency,
    available: stockBreakdown(product, orders).available,
    canCart: Boolean(priceCents && product.allowCart !== false),
    canDirectOrder: Boolean(priceCents && product.allowDirectOrder !== false)
  };
}

export async function getPurchaseOffer(slug: string, orders: readonly StoreOrder[]) {
  if (isSpecialPayment(slug)) {
    const product = products[slug];
    return {
      id: '', slug, name: product.name, image: product.image,
      priceCents: Math.round(product.priceAmount * 100), currency: 'USD' as const,
      available: 99, canCart: false, canDirectOrder: true
    };
  }
  const product = (await listAdminProducts()).find((item) => item.slug === slug && item.status === 'published');
  return product ? catalogOffer(product, orders) : null;
}

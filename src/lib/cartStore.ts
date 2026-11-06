import {cookies} from 'next/headers';
import {randomUUID} from 'node:crypto';
import {readStoreObject, withStoreLock, writeStoreObject} from '@/lib/durableStore';
import {listAdminProducts} from '@/lib/backendStore';
import {readStoreOrders} from '@/lib/commerceStore';
import {catalogOffer, isSpecialPayment} from '@/lib/purchaseCatalog';

const CART_COOKIE = 'cheerdmoto_cart_id';

export type CartItem = {productSlug: string; quantity: number; addedAt: string};
export type CartRecord = {id: string; items: CartItem[]; updatedAt: string};

function cartFile(id: string) {
  return `carts/cart-${id.replace(/[^a-zA-Z0-9_-]/g, '')}.json`;
}

function createCartId() {
  return `cart_${randomUUID().replace(/-/g, '')}`;
}

function validProduct(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,119}$/.test(value) && !isSpecialPayment(value);
}

function cleanQuantity(value: unknown) {
  return Math.max(1, Math.min(99, Number.parseInt(String(value), 10) || 1));
}

async function cartIdFromCookie() {
  const store = await cookies();
  const id = store.get(CART_COOKIE)?.value || '';
  return /^cart_[a-f0-9]{32}$/.test(id) ? id : '';
}

async function readCart(id: string): Promise<CartRecord> {
  const cart = id ? await readStoreObject<CartRecord>(cartFile(id)) : null;
  return cart && Array.isArray(cart.items) ? cart : {id, items: [], updatedAt: new Date().toISOString()};
}

export async function getCurrentCart() {
  const id = await cartIdFromCookie();
  return id ? readCart(id) : {id: '', items: [], updatedAt: ''};
}

export async function addCartItem(productSlug: unknown, quantity: unknown) {
  return changeCart(productSlug, quantity, 'add');
}

export async function updateCartItem(productSlug: unknown, quantity: unknown) {
  return changeCart(productSlug, quantity, 'update');
}

export async function removeCartItem(productSlug: unknown) {
  return changeCart(productSlug, 1, 'remove');
}

async function changeCart(productSlug: unknown, quantity: unknown, action: 'add' | 'update' | 'remove') {
  if (!validProduct(productSlug)) throw new Error('INVALID_PRODUCT');
  const store = await cookies();
  let id = await cartIdFromCookie();
  if (!id && action !== 'add') return presentCart({id: '', items: [], updatedAt: ''});
  if (!id) {
    id = createCartId();
    store.set(CART_COOKIE, id, {httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30});
  }
  const next = await withStoreLock(id, async () => {
    const cart = await readCart(id);
    const items = [...cart.items];
    const index = items.findIndex((item) => item.productSlug === productSlug);
    const now = new Date().toISOString();
    if (action === 'remove') {
      if (index !== -1) items.splice(index, 1);
    } else if (action === 'add' || index !== -1) {
      const count = (action === 'add' ? items[index]?.quantity || 0 : 0) + cleanQuantity(quantity);
      const [products, orders] = await Promise.all([listAdminProducts(), readStoreOrders()]);
      const product = products.find((candidate) => candidate.slug === productSlug && candidate.status === 'published');
      const offer = product && catalogOffer(product, orders);
      if (!offer?.canCart) throw new Error('INVALID_PRODUCT');
      if (count > Math.min(99, offer.available)) throw new Error('INSUFFICIENT_STOCK');
      const item = {productSlug, quantity: count, addedAt: items[index]?.addedAt || now};
      if (index === -1) items.push(item);
      else items[index] = item;
    }
    const updated = {id, items, updatedAt: now};
    await writeStoreObject(cartFile(id), updated);
    return updated;
  }, {attempts: 8, ttlSeconds: 30});
  return presentCart(next);
}

export async function presentCart(cart: CartRecord) {
  if (!cart.items.length) return {id: cart.id, items: [], itemCount: 0, subtotal: 0};
  const [products, orders] = await Promise.all([listAdminProducts(), readStoreOrders()]);
  const items = cart.items.map((item) => {
    const product = products.find((candidate) => candidate.slug === item.productSlug && candidate.status === 'published');
    const offer = product && catalogOffer(product, orders);
    const maxQuantity = offer?.canCart ? Math.min(offer.available, 99) : 0;
    const priceCents = offer?.priceCents || 0;
    return {
      ...item,
      name: offer?.name || 'Unavailable product',
      image: offer?.image || '',
      price: priceCents / 100,
      currency: offer?.currency || 'USD',
      maxQuantity,
      subtotalCents: item.quantity <= maxQuantity ? priceCents * item.quantity : 0,
      subtotal: item.quantity <= maxQuantity ? priceCents * item.quantity / 100 : 0
    };
  });
  return {id: cart.id, items, itemCount: items.reduce((total, item) => total + item.quantity, 0), subtotal: items.reduce((total, item) => total + item.subtotalCents, 0) / 100};
}

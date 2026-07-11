import {cookies} from 'next/headers';
import {randomUUID} from 'node:crypto';
import {readStoreObject, writeStoreObject} from '@/lib/durableStore';
import {checkoutProductSlugs, products, type CheckoutProductSlug} from '@/lib/site';

const CART_COOKIE = 'cheerdmoto_cart_id';

export type CartItem = {productSlug: CheckoutProductSlug; quantity: number; addedAt: string};
export type CartRecord = {id: string; items: CartItem[]; updatedAt: string};

function cartFile(id: string) {
  return `carts/cart-${id.replace(/[^a-zA-Z0-9_-]/g, '')}.json`;
}

function createCartId() {
  return `cart_${randomUUID().replace(/-/g, '')}`;
}

function validProduct(value: unknown): value is CheckoutProductSlug {
  return checkoutProductSlugs.includes(value as CheckoutProductSlug) && value !== 'payment-test' && value !== 'one-time-35';
}

function cleanQuantity(value: unknown) {
  return Math.max(1, Math.min(99, Number.parseInt(String(value), 10) || 1));
}

async function cartIdFromCookie() {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value || '';
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
  if (!validProduct(productSlug)) throw new Error('INVALID_PRODUCT');
  const store = await cookies();
  let id = store.get(CART_COOKIE)?.value || '';
  if (!id) {
    id = createCartId();
    store.set(CART_COOKIE, id, {httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30});
  }
  const cart = await readCart(id);
  const nextQuantity = cleanQuantity(quantity);
  const existing = cart.items.find((item) => item.productSlug === productSlug);
  const now = new Date().toISOString();
  const items = existing
    ? cart.items.map((item) => item.productSlug === productSlug ? {...item, quantity: Math.min(99, item.quantity + nextQuantity)} : item)
    : [...cart.items, {productSlug, quantity: nextQuantity, addedAt: now}];
  const next = {id, items, updatedAt: now};
  await writeStoreObject(cartFile(id), next);
  return presentCart(next);
}

export async function updateCartItem(productSlug: unknown, quantity: unknown) {
  if (!validProduct(productSlug)) throw new Error('INVALID_PRODUCT');
  const id = await cartIdFromCookie();
  if (!id) return presentCart({id: '', items: [], updatedAt: ''});
  const cart = await readCart(id);
  const next = {
    ...cart,
    items: cart.items.map((item) => item.productSlug === productSlug ? {...item, quantity: cleanQuantity(quantity)} : item),
    updatedAt: new Date().toISOString()
  };
  await writeStoreObject(cartFile(id), next);
  return presentCart(next);
}

export async function removeCartItem(productSlug: unknown) {
  if (!validProduct(productSlug)) throw new Error('INVALID_PRODUCT');
  const id = await cartIdFromCookie();
  if (!id) return presentCart({id: '', items: [], updatedAt: ''});
  const cart = await readCart(id);
  const next = {...cart, items: cart.items.filter((item) => item.productSlug !== productSlug), updatedAt: new Date().toISOString()};
  await writeStoreObject(cartFile(id), next);
  return presentCart(next);
}

export function presentCart(cart: CartRecord) {
  const items = cart.items.map((item) => {
    const product = products[item.productSlug];
    return {
      ...item,
      name: product.name,
      image: product.image,
      price: product.priceAmount,
      currency: 'USD' as const,
      subtotal: product.priceAmount * item.quantity
    };
  });
  return {id: cart.id, items, itemCount: items.reduce((total, item) => total + item.quantity, 0), subtotal: items.reduce((total, item) => total + item.subtotal, 0)};
}

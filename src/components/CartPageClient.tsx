'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {StorefrontV1, StoreIcon, StoreIntro, StoreLink} from './StorefrontV1';
import {modelLayout} from '@/lib/storefrontModels';

type CartItem = {productSlug: string; quantity: number; name: string; image: string; price: number; currency: string; subtotal: number; maxQuantity: number};
type Cart = {items: CartItem[]; itemCount: number; subtotal: number};

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: currency || 'USD', minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2}).format(value);
}

export default function CartPageClient() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function loadCart() {
    try {
      setError('');
      const response = await fetch('/api/cart', {cache: 'no-store'});
      if (!response.ok) throw new Error('Unable to load cart');
      setCart(await response.json());
    } catch {
      setError('We could not load your cart. Please try again.');
    }
  }

  useEffect(() => { void loadCart(); }, []);

  async function update(productSlug: string, action: 'update' | 'remove', quantity = 1) {
    setBusy(productSlug);
    setError('');
    try {
      const response = await fetch('/api/cart', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action, productSlug, quantity})});
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'We could not update your cart. Please try again.');
      setCart(data.cart);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'We could not update your cart. Please try again.');
    } finally {
      setBusy('');
    }
  }

  const only = cart?.items.length === 1 ? cart.items[0] : undefined;
  const checkoutHref = (item: CartItem) => `/checkout?product=${encodeURIComponent(item.productSlug)}&qty=${item.quantity}&source=cart`;

  return <StorefrontV1><main>
    <StoreIntro eyebrow="COWIN / Shopping bag" title="Your cart">Review the items in your cart before checking out.</StoreIntro>
    <section className="shell section">
      {error && <p className="note" role="alert">{error}</p>}
      {!cart ? <div className="empty">{error ? <button className="button primary" onClick={loadCart}>Try again</button> : <p role="status">Loading your cart…</p>}</div>
        : cart.items.length === 0 ? <div className="empty"><span className="state-symbol"><StoreIcon name="shopping-bag" /></span><h2>Your cart is empty</h2><p>Explore the lineup to find your COWIN.</p><StoreLink href="/products" primary arrow>Browse products</StoreLink></div>
        : <div className="cart-grid">
          <section className="panel"><h2>Items in your cart</h2>{cart.items.map((item) => <article className="cart-row" key={item.productSlug}>
            {item.image ? <Image src={item.image} alt={item.name} width={140} height={104} sizes="140px" /> : <StoreIcon name={modelLayout(item.productSlug)?.illustration || 'box'} />}
            <div><h3>{item.maxQuantity > 0 ? <Link href={`/products/${item.productSlug}`}>{modelLayout(item.productSlug)?.title || item.name}</Link> : modelLayout(item.productSlug)?.title || item.name}</h3>
              <p className="small">{item.maxQuantity > 0 ? `${money(item.price, item.currency)} each` : 'Currently unavailable'}</p>
              <div className="qty"><button type="button" onClick={() => update(item.productSlug, 'update', Math.min(item.maxQuantity, item.quantity - 1))} disabled={Boolean(busy) || item.quantity <= 1 || !item.maxQuantity} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button type="button" onClick={() => update(item.productSlug, 'update', item.quantity + 1)} disabled={Boolean(busy) || item.quantity >= item.maxQuantity} aria-label="Increase quantity">+</button></div>
              <button className="inline small sf-text-button" type="button" onClick={() => update(item.productSlug, 'remove')} disabled={Boolean(busy)}>Remove</button>
            </div><div>{item.quantity <= item.maxQuantity ? <><strong>{money(item.subtotal, item.currency)}</strong>{!only && <div className="actions"><StoreLink href={checkoutHref(item)} primary>Checkout item</StoreLink></div>}</> : <span className="small">{item.maxQuantity ? 'Reduce quantity to continue' : 'Unavailable'}</span>}</div>
          </article>)}</section>
          <aside className="panel summary-panel"><h2>Order summary</h2><dl className="speclist"><div><dt>Subtotal</dt><dd>{money(cart.subtotal, 'USD')}</dd></div><div><dt>Delivery</dt><dd>Calculated at checkout</dd></div></dl>
            {only && only.quantity <= only.maxQuantity ? <StoreLink href={checkoutHref(only)} primary arrow>Proceed to checkout</StoreLink> : <p className="small sf-spaced">{only ? 'Review item availability before checkout.' : 'Choose an available product to check out that item.'}</p>}
            <Link className="inline sf-spaced" href="/products">Continue shopping <StoreIcon name="arrow-right" /></Link>
          </aside>
        </div>}
    </section>
  </main></StorefrontV1>;
}

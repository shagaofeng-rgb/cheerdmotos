'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useState} from 'react';

type CartItem = {productSlug: string; quantity: number; name: string; image: string; price: number; currency: string; subtotal: number};
type Cart = {items: CartItem[]; itemCount: number; subtotal: number};

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0}).format(value);
}

export default function CartPageClient() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState('');

  async function loadCart() {
    const response = await fetch('/api/cart', {cache: 'no-store'});
    const data = await response.json();
    setCart(data);
  }

  useEffect(() => { void loadCart(); }, []);

  async function update(productSlug: string, action: 'update' | 'remove', quantity = 1) {
    setBusy(productSlug);
    try {
      const response = await fetch('/api/cart', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action, productSlug, quantity})});
      const data = await response.json();
      if (data.ok) setCart(data.cart);
    } finally {
      setBusy('');
    }
  }

  if (!cart) return <main className="cart-page"><p>Loading your cart...</p></main>;
  if (!cart.items.length) return <main className="cart-page cart-empty"><p className="eyebrow">Your cart</p><h1>Your cart is empty.</h1><Link className="button primary" href="/products">Browse products</Link></main>;

  return <main className="cart-page">
    <div className="cart-heading"><p className="eyebrow">Your cart</p><h1>Ready when you are.</h1><p>{cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} saved to this device.</p></div>
    <div className="cart-layout">
      <section className="cart-items">{cart.items.map((item) => <article key={item.productSlug}>
        <div className="cart-item-image">{item.image ? <Image src={item.image} alt={item.name} fill sizes="112px" /> : <span>CHEERDMOTO</span>}</div>
        <div><h2>{item.name}</h2><p>{money(item.price, item.currency)} each</p><div className="cart-quantity"><button type="button" onClick={() => update(item.productSlug, 'update', Math.max(1, item.quantity - 1))} disabled={busy === item.productSlug || item.quantity <= 1}>-</button><span>{item.quantity}</span><button type="button" onClick={() => update(item.productSlug, 'update', item.quantity + 1)} disabled={busy === item.productSlug}>+</button></div></div>
        <div className="cart-item-actions"><strong>{money(item.subtotal, item.currency)}</strong><Link className="button primary" href={`/checkout?product=${encodeURIComponent(item.productSlug)}&qty=${item.quantity}`}>Checkout</Link><button type="button" onClick={() => update(item.productSlug, 'remove')} disabled={busy === item.productSlug}>Remove</button></div>
      </article>)}</section>
      <aside className="cart-summary"><span>Items subtotal</span><strong>{money(cart.subtotal, 'USD')}</strong><p>Shipping and final payment options are confirmed during checkout for each item.</p><Link href="/products">Continue shopping</Link></aside>
    </div>
  </main>;
}

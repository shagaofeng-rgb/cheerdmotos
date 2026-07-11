'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {SiteItem} from '@/types';
import type {ProductPresentation} from '@/lib/productPresentation';

type ProductDetailProps = {
  item: SiteItem;
  product: ProductPresentation;
};

function money(currency: string, value: string) {
  const amount = Number(String(value || '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0}).format(amount);
}

function track(type: string, payload: Record<string, unknown>) {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({type, page: window.location.pathname, pageTitle: document.title, timestamp: new Date().toISOString(), ...payload}),
    keepalive: true
  }).catch(() => {});
}

export default function ProductDetail({item, product}: ProductDetailProps) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cartState, setCartState] = useState<'idle' | 'loading' | 'added' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState('description');
  const price = money(item.currency, item.price);
  const gallery = product.gallery;
  const currentImage = gallery[activeImage] || '';

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightboxOpen(false);
    }
    if (lightboxOpen) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen]);

  useEffect(() => {
    track('view_item', {productSlug: item.slug, product: product.displayName, price, currency: item.currency});
  }, [item.currency, item.slug, price, product.displayName]);

  function changeQuantity(next: number) {
    setQuantity(Math.max(1, Math.min(99, Number.isFinite(next) ? next : 1)));
  }

  async function addToCart() {
    if (!product.inStock || cartState === 'loading') return;
    setCartState('loading');
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'add', productSlug: item.slug, quantity})
      });
      if (!response.ok) throw new Error('Cart request failed');
      setCartState('added');
      track('add_to_cart', {productSlug: item.slug, product: product.displayName, quantity, price, currency: item.currency});
    } catch {
      setCartState('error');
    }
  }

  function buyNow() {
    if (!product.inStock) return;
    track('begin_checkout', {productSlug: item.slug, product: product.displayName, quantity, price, currency: item.currency});
    router.push(`/checkout?product=${encodeURIComponent(item.slug)}&qty=${quantity}`);
  }

  const tabs = [
    {id: 'description', label: 'Description'},
    {id: 'specifications', label: 'Specifications'},
    {id: 'shipping', label: 'Shipping & Returns'},
    {id: 'reviews', label: 'Reviews'},
    {id: 'faq', label: 'FAQ'}
  ];

  return (
    <>
      <section className="pdp-trust-strip" aria-label="Shopping assurances">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.7c0 4.5 3.1 7.6 7.5 9.3 4.4-1.7 7.5-4.8 7.5-9.3V6L12 3Z" /><path d="m8.7 12 2.1 2.1 4.6-4.6" /></svg>Secure payment</span>
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v10H3z" /><path d="M14 10h3l3 3v4h-6zM6 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg>Global shipping</span>
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" /><path d="M8.5 12.2 10.8 15l4.8-6" /></svg>Reliable service</span>
      </section>

      <nav className="pdp-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span>/</span><Link href="/products">Products</Link><span>/</span><Link href={product.categoryRoute}>{product.category}</Link><span>/</span><span aria-current="page">{product.displayName}</span>
      </nav>

      <section className="pdp-hero">
        <div className="pdp-media">
          <div className="pdp-main-image">
            {currentImage ? (
              <button type="button" className="pdp-image-button" onClick={() => setLightboxOpen(true)} aria-label={`Expand ${product.displayName} image`}>
                <Image src={currentImage} alt={`${product.displayName} product view ${activeImage + 1}`} fill priority sizes="(max-width: 820px) 100vw, 56vw" />
              </button>
            ) : <div className="pdp-image-missing">Product image will be added soon.</div>}
          </div>
          {gallery.length > 1 ? <div className="pdp-thumbnails" aria-label="Product images">
            {gallery.map((image, index) => <button type="button" className={index === activeImage ? 'is-active' : ''} onClick={() => setActiveImage(index)} aria-pressed={index === activeImage} key={image}>
              <Image src={image} alt={`${product.displayName} thumbnail ${index + 1}`} width={112} height={84} sizes="84px" />
            </button>)}
          </div> : null}
        </div>

        <div className="pdp-summary">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.displayName}</h1>
          <div className="pdp-identifiers"><span>Model: {product.model}</span><span>SKU: {product.sku}</span></div>
          {price ? <p className="pdp-price">{price}</p> : <p className="pdp-price-note">Contact support for current pricing.</p>}
          <p className={product.inStock ? 'pdp-stock is-available' : 'pdp-stock is-unavailable'}>{product.inStock ? 'In stock' : 'Currently unavailable'}</p>
          <p className="pdp-description">{product.shortDescription}</p>
          {product.keyFeatures.length ? <ul className="pdp-features">{product.keyFeatures.map((feature) => <li key={feature}>{feature}</li>)}</ul> : null}

          <div className="pdp-quantity" role="group" aria-label="Quantity selector">
            <span>Quantity</span>
            <div>
              <button type="button" onClick={() => changeQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity">-</button>
              <input aria-label="Quantity" inputMode="numeric" value={quantity} onChange={(event) => changeQuantity(Number(event.target.value))} onBlur={() => changeQuantity(quantity)} />
              <button type="button" onClick={() => changeQuantity(quantity + 1)} disabled={quantity >= 99} aria-label="Increase quantity">+</button>
            </div>
          </div>

          <div className="pdp-actions">
            <button type="button" className="pdp-buy-now" onClick={buyNow} disabled={!product.inStock}>Buy now</button>
            <button type="button" className="pdp-add-cart" onClick={addToCart} disabled={!product.inStock || cartState === 'loading'}>{cartState === 'loading' ? 'Adding...' : 'Add to cart'}</button>
          </div>
          {cartState === 'added' ? <p className="pdp-cart-message">Added to your cart. <Link href="/cart">View cart</Link></p> : null}
          {cartState === 'error' ? <p className="pdp-cart-message is-error">We could not update your cart. Please try again.</p> : null}

          <div className="pdp-payment-trust">
            <strong>Secure credit card checkout</strong>
            <p>Payment is processed securely by Oceanpayment after your order details are submitted. We do not store card details.</p>
          </div>
          <div className="pdp-policy-links"><Link href="/shipping-returns">Shipping & returns</Link><Link href="/warranty">Warranty support</Link></div>
        </div>
      </section>

      {product.quickSpecs.length ? <section className="pdp-quick-specs" aria-label="Quick specifications">
        {product.quickSpecs.map((spec) => <article key={spec.label}><span>{spec.label}</span><strong>{spec.value}</strong></article>)}
      </section> : null}

      <section className="pdp-details" aria-label="Product details">
        <div className="pdp-detail-tabs" role="tablist" aria-label="Product information">
          {tabs.map((tab) => <button type="button" key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
        </div>
        <div className="pdp-detail-panel" role="tabpanel">
          {activeTab === 'description' ? <DescriptionContent product={product} /> : null}
          {activeTab === 'specifications' ? <Specifications product={product} /> : null}
          {activeTab === 'shipping' ? <ShippingContent /> : null}
          {activeTab === 'reviews' ? <ReviewsContent /> : null}
          {activeTab === 'faq' ? <FaqContent product={product} /> : null}
        </div>
        <div className="pdp-mobile-details">
          <details open><summary>Description</summary><DescriptionContent product={product} /></details>
          <details><summary>Specifications</summary><Specifications product={product} /></details>
          <details><summary>Shipping & returns</summary><ShippingContent /></details>
          <details><summary>Reviews</summary><ReviewsContent /></details>
          <details><summary>FAQ</summary><FaqContent product={product} /></details>
        </div>
      </section>

      <div className="pdp-mobile-purchase" aria-label="Mobile purchase actions">
        <div><span>{product.inStock ? 'In stock' : 'Unavailable'}</span><strong>{price || 'Contact us'}</strong></div>
        <button type="button" onClick={addToCart} disabled={!product.inStock || cartState === 'loading'} aria-label="Add product to cart">Cart</button>
        <button type="button" onClick={buyNow} disabled={!product.inStock}>Buy now</button>
      </div>

      {lightboxOpen && currentImage ? <div className="pdp-lightbox" role="dialog" aria-modal="true" aria-label={`${product.displayName} image preview`} onClick={() => setLightboxOpen(false)}>
        <div className="pdp-lightbox-content" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="pdp-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Close image preview">×</button>
          <Image src={currentImage} alt={`${product.displayName} enlarged product view`} fill sizes="95vw" />
        </div>
      </div> : null}
    </>
  );
}

function DescriptionContent({product}: {product: ProductPresentation}) {
  return <div className="pdp-copy"><p>{product.description}</p>{product.featureImage ? <div className="pdp-feature-image"><Image src={product.featureImage} alt={`${product.displayName} product detail`} fill sizes="(max-width: 820px) 100vw, 900px" /></div> : null}{product.packageIncludes.length ? <><h3>Package includes</h3><ul>{product.packageIncludes.map((item) => <li key={item}>{item}</li>)}</ul></> : null}</div>;
}

function Specifications({product}: {product: ProductPresentation}) {
  return <div className="pdp-specifications">{product.specifications.map((spec) => <div key={spec.label}><span>{spec.label}</span><strong>{spec.value}</strong></div>)}</div>;
}

function ShippingContent() {
  return <div className="pdp-copy"><p>Shipping, delivery, and return options are confirmed according to the destination and order configuration. Review the current policy before ordering.</p><p><Link href="/shipping-returns">Read shipping & returns</Link> <Link href="/warranty">Read warranty support</Link></p></div>;
}

function ReviewsContent() {
  return <div className="pdp-copy"><p>Customer reviews will be available soon.</p></div>;
}

function FaqContent({product}: {product: ProductPresentation}) {
  return <div className="pdp-faq">{product.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>;
}

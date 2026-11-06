'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {preload} from 'react-dom';
import {StoreIcon} from './StorefrontV1';
import {modelLayout} from '@/lib/storefrontModels';
import {useRouter} from 'next/navigation';
import type {SiteItem} from '@/types';
import type {ProductPresentation} from '@/lib/productPresentation';

type ProductDetailProps = {
  item: SiteItem;
  product: ProductPresentation;
  activeSection: string;
};

const productSections = [
  {id: 'overview', label: 'Overview'},
  {id: 'specifications', label: 'Specifications'},
  {id: 'included', label: 'In the box'},
  {id: 'shipping', label: 'Shipping & returns'},
  {id: 'support', label: 'Support'},
  {id: 'resources', label: 'Related resources'},
  {id: 'reviews', label: 'Reviews'}
] as const;

type ProductSection = (typeof productSections)[number]['id'];

function productSection(value: string): ProductSection {
  return productSections.some((section) => section.id === value) ? value as ProductSection : 'overview';
}

function money(currency: string, value: string) {
  const amount = Number(String(value || '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: currency || 'USD', minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2}).format(amount);
}

function track(type: string, payload: Record<string, unknown>) {
  try {
    const visitorId = window.localStorage.getItem('cheerdmoto_visitor_id') || `v_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const sessionId = window.sessionStorage.getItem('cheerdmoto_session_id') || `s_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem('cheerdmoto_visitor_id', visitorId);
    window.sessionStorage.setItem('cheerdmoto_session_id', sessionId);
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({type, visitorId, sessionId, page: window.location.pathname, pageTitle: document.title, timestamp: new Date().toISOString(), ...payload}),
      keepalive: true
    }).catch(() => {});
  } catch {
    // Browser privacy settings may disable client analytics storage.
  }
}

function metricEquivalent(value: string) {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(mph|lbs?|in|inches)$/i);
  if (!match) return '';
  const conversions: Record<string, [number, string]> = {
    mph: [1.609344, 'km/h'], lb: [0.45359237, 'kg'], lbs: [0.45359237, 'kg'],
    in: [2.54, 'cm'], inches: [2.54, 'cm']
  };
  const [factor, unit] = conversions[match[2].toLowerCase()];
  return `${Math.round(Number(match[1]) * factor * 10) / 10} ${unit}`;
}

export default function ProductDetail({item, product, activeSection: requestedSection}: ProductDetailProps) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const layout = modelLayout(item.slug);
  const modelTitle = layout?.title || product.displayName;
  const quickSpecs = layout?.quickSpecs || product.quickSpecs;
  const [cartState, setCartState] = useState<'idle' | 'loading' | 'added' | 'error'>('idle');
  const [cartError, setCartError] = useState('');
  const activeSection = productSection(requestedSection);
  const price = money(item.currency, item.price);
  const gallery = product.gallery;
  const currentImage = gallery[activeImage] || '';
  if (gallery[0]?.endsWith('_transparent.png')) {
    preload('/homepage-precision/precision-studio-hero.webp', {as: 'image', fetchPriority: 'high'});
  }
  const quantityLimit = Math.max(1, Math.min(item.offer?.available ?? 99, 99));
  const canBuy = product.inStock && item.offer?.canDirectOrder !== false;
  const canCart = product.inStock && item.offer?.canCart !== false;
  const dealerLink = `/dealer-program?product=${encodeURIComponent(item.slug)}#application`;

  useEffect(() => {
    track('view_item', {productSlug: item.slug, product: product.displayName, price, currency: item.currency});
  }, [item.currency, item.slug, price, product.displayName]);

  function changeQuantity(next: number) {
    setQuantity(Math.max(1, Math.min(quantityLimit, Number.isFinite(next) ? Math.trunc(next) : 1)));
  }

  async function addToCart() {
    if (!canCart || cartState === 'loading') return;
    setCartState('loading');
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'add', productSlug: item.slug, quantity})
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'We could not update your cart. Please try again.');
      setCartState('added');
      track('add_to_cart', {productSlug: item.slug, product: product.displayName, quantity, price, currency: item.currency});
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'We could not update your cart. Please try again.');
      setCartState('error');
    }
  }

  function buyNow() {
    if (!canBuy) return;
    track('begin_checkout', {productSlug: item.slug, product: product.displayName, quantity, price, currency: item.currency});
    router.push(`/checkout?product=${encodeURIComponent(item.slug)}&qty=${quantity}`);
  }

  const sectionHref = (section: ProductSection) => section === 'overview' ? item.route : `${item.route}?section=${section}`;

  const breadcrumb = <nav className="crumb" aria-label="Breadcrumb"><Link href="/products">Products</Link><span>/</span><Link href={product.categoryRoute}>{product.category}</Link><span>/</span><span aria-current="page">{modelTitle}</span></nav>;
  const quantityControl = <div className="qty" role="group" aria-label="Quantity selector">
    <button type="button" onClick={() => changeQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
    <input aria-label="Quantity" inputMode="numeric" value={quantity} onChange={(event) => changeQuantity(Number(event.target.value))} />
    <button type="button" onClick={() => changeQuantity(quantity + 1)} disabled={quantity >= quantityLimit} aria-label="Increase quantity">+</button>
  </div>;
  const buy = canBuy && <button type="button" className="button primary" onClick={buyNow}>Buy now</button>;
  const cart = canCart && <button type="button" className={`button ${canBuy ? 'secondary' : 'primary'}`} onClick={addToCart} disabled={cartState === 'loading'}>{cartState === 'loading' ? 'Adding…' : 'Add to cart'}</button>;
  const cartMessage = cartState === 'added' ? <>Added to your cart. <Link href="/cart">View cart</Link></> : cartState === 'error' ? cartError : null;
  const switchImage = (step: number) => setActiveImage((activeImage + step + gallery.length) % gallery.length);

  return (
    <>
      <section className="pdp-grid">
        <div className="pdp-heading">
          {breadcrumb}
          <p className="kicker">{product.category}</p>
          <h1 className={modelTitle.length > 17 ? 'long-title' : undefined}>{modelTitle}</h1>
          {layout && <p className="tagline">{layout.tagline}</p>}
        </div>
        <div className="pdp-visual">
          {currentImage ? <>
            <div className={`stage${currentImage.endsWith('_transparent.png') ? '' : ' photo'}`}>
              <Image src={currentImage} alt={`${product.displayName} product view ${activeImage + 1}`} fill preload={activeImage === 0} sizes="(max-width: 760px) 100vw, 59vw" />
              <span className="gallery-count">{String(activeImage + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}</span>
              <button type="button" className="zoom" onClick={() => {
                dialog.current?.showModal();
                setExpanded(true);
              }} aria-label={`Expand ${product.displayName} image`}><StoreIcon name="maximize2" loading="eager" /></button>
            </div>
            {gallery.length > 1 && <div className="thumbs" aria-label="Product images">
              <button type="button" className="arrow" onClick={() => switchImage(-1)} aria-label="Previous product image"><StoreIcon name="chevron-left" /></button>
              {gallery.map((image, index) => <button type="button" key={image} onClick={() => setActiveImage(index)} aria-label={`View product image ${index + 1}`} aria-pressed={index === activeImage}><Image src={image} alt="" width={108} height={68} sizes="108px" /></button>)}
              <button type="button" className="arrow" onClick={() => switchImage(1)} aria-label="Next product image"><StoreIcon name="chevron-right" /></button>
            </div>}
            <dialog ref={dialog} onClose={() => setExpanded(false)} aria-label={`${product.displayName} image preview`}>
              <form method="dialog"><button type="submit" className="button secondary">Close</button></form>
              {expanded && <Image src={currentImage} alt={product.displayName} width={1080} height={770} sizes="90vw" />}
            </dialog>
          </> : <>
            <div className="stage diagram"><div className="figure"><StoreIcon name={layout?.illustration || 'box'} /><small>Illustration · product photo pending</small></div></div>
            <p className="gallery-note">COWIN / {product.category}</p>
          </>}
        </div>
        <div className="summary">
          <div className="price-line"><strong className="sf-price">{price || 'Ask for pricing'}</strong><span className={`stock${product.inStock ? '' : ' unavailable'}`}>{product.inStock ? 'In stock' : 'Currently unavailable'}</span></div>
          <p>{layout?.intro || product.shortDescription}</p>
          {quickSpecs.length > 0 && <dl className="quick" style={{'--cols': Math.min(4, quickSpecs.length)} as React.CSSProperties}>{quickSpecs.map(({label, value}) => {
            const metric = metricEquivalent(value);
            return <div key={label}><dt>{label}</dt><dd>{value}{metric && <small>{metric}</small>}</dd></div>;
          })}</dl>}
          {(canBuy || canCart) && <div className="purchase"><span className="mobile-qty-label">Quantity</span>{quantityControl}{buy}{cart}</div>}
          {cartMessage && <p className="sf-cart-feedback" role="status">{cartMessage}</p>}
          <p className="pdp-dealer"><Link className="inline" href={dealerLink}>Request a dealer or bulk quote <StoreIcon name="arrow-right" /></Link><small>Ask about minimum order, lead time and delivery to your market.</small></p>
          <div className="assurance">
            <Link href="/shipping-returns"><StoreIcon name="truck" /><span>Shipping &amp; returns<small>See delivery and return terms</small></span></Link>
            <Link href="/warranty"><StoreIcon name="shield-check" /><span>Warranty support<small>Check support for your model</small></span></Link>
          </div>
        </div>
      </section>

      <section className="pdp-info" aria-label="Product details">
        <nav className="tabbar" aria-label="Product information sections">
          {productSections.filter(({id}) => id !== 'reviews' && id !== 'resources').map(({id, label}) => <Link key={id} href={sectionHref(id)} scroll={false} aria-current={activeSection === id ? 'page' : undefined}>{id === 'specifications' && layout?.illustration ? 'Compatibility' : label}</Link>)}
        </nav>
        <div className="pane" id={`product-section-${activeSection}`}>
          {activeSection === 'overview' && <><h2>{layout?.heading || 'Product overview'}</h2><p>{layout?.detail || product.description}</p>{layout?.illustration && <Link className="inline" href="/support#contact">Check compatibility <StoreIcon name="arrow-right" /></Link>}</>}
          {activeSection === 'specifications' && <><h2>{layout?.illustration ? 'Compatibility' : 'Technical specifications'}</h2><dl className="speclist">{(product.specifications.length ? product.specifications : quickSpecs).map(({label, value}) => {
            const metric = metricEquivalent(value);
            return <div key={label}><dt>{label}</dt><dd>{value}{metric && ` / ${metric}`}</dd></div>;
          })}</dl></>}
          {activeSection === 'included' && <PackageContent product={product} />}
          {activeSection === 'shipping' && <ShippingContent />}
          {activeSection === 'support' && <SupportContent product={product} />}
          {activeSection === 'resources' && <ResourcesContent />}
          {activeSection === 'reviews' && <ReviewsContent />}
        </div>
      </section>

      {(canBuy || canCart) && <div className="mobile-buy" aria-label="Mobile purchase actions">
        {cartMessage && <p className="mobile-cart-feedback" role="status">{cartMessage}</p>}
        <strong>{price || 'Contact us'}</strong>{buy}{cart}
      </div>}
    </>
  );
}

function PackageContent({product}: {product: ProductPresentation}) {
  return <div className="pdp-copy"><h2>What is included</h2>{product.packageIncludes.length ? <ul>{product.packageIncludes.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Package contents are confirmed with the selected configuration and delivery destination before dispatch.</p>}</div>;
}

function ShippingContent() {
  return <div className="pdp-copy"><h2>Shipping & returns</h2><p>Shipping, delivery, and return options are confirmed according to the destination and order configuration. Review the current policy before ordering.</p><p><Link href="/shipping-returns">Read shipping & returns</Link></p></div>;
}

function ReviewsContent() {
  return <div className="pdp-copy"><h2>Customer reviews</h2><p>Verified customer reviews will be available here as they are collected.</p></div>;
}

function SupportContent({product}: {product: ProductPresentation}) {
  return <div className="pdp-section-stack"><div className="pdp-copy"><h2>Support & FAQ</h2><p>Use the matching product model, order number, serial information and delivery details when contacting the COWIN support team.</p><p><Link className="inline" href="/warranty">Warranty support</Link> <Link className="inline" href="/manuals">Product manuals</Link> <Link className="inline" href="?section=resources" scroll={false}>Related resources</Link></p></div><div className="pdp-faq">{product.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div>;
}

function ResourcesContent() {
  return <div className="pdp-copy"><h2>Related resources</h2><p>Browse the news, buying guides and compatible products selected for this model. These resources are shown only in this section, so the product page stays focused on the information you are viewing.</p></div>;
}

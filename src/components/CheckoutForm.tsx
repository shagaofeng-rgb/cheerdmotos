'use client';

import {useEffect, useMemo, useState} from 'react';
import Script from 'next/script';
import {shippingEstimateFor} from '@/lib/shipping';
import type {CheckoutProductSlug} from '@/lib/site';
import {classifyTraffic, isMeaningfulMarketingTouch, type TrafficTouch} from '@/lib/trafficAttribution';

type CheckoutFormProps = {
  locale: string;
  productSlug: CheckoutProductSlug;
  productName: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  shippingEstimate: number;
};

type OceanpaymentTab = 'oceanpayment_card' | 'oceanpayment_google_pay' | 'oceanpayment_apple_pay';
type CheckoutPaymentMethod = OceanpaymentTab | 'bank_transfer';
type OceanpaymentScene = '3d' | 'non-3d';

const cardBadges = ['VISA', 'MC', 'DISCOVER', 'JCB', '+6'];
const multiplePaymentBadges = ['Google Pay', 'Apple Pay', 'Local Pay', 'Bank', '+41'];

type OceanpaymentPayload = {
  gatewayUrl: string;
  fields: Record<string, string>;
  testMode?: boolean;
};

type OceanpaymentCallbackData = string | Record<string, unknown>;

function readOceanpaymentValue(data: OceanpaymentCallbackData, key: string) {
  if (typeof data !== 'string') {
    const value = data[key];
    return typeof value === 'string' ? value : '';
  }
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const xmlMatch = data.match(new RegExp(`<${escapedKey}[^>]*>([^<]+)<\\/${escapedKey}>`, 'i'));
  if (xmlMatch) return xmlMatch[1];
  const params = new URLSearchParams(data);
  return params.get(key) || '';
}

function getId(storage: Storage, key: string, prefix: string) {
  let value = storage.getItem(key);
  if (!value) {
    value = `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    storage.setItem(key, value);
  }
  return value;
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function localizedUrl(locale: string, path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedLocale = locale.trim().replace(/^\/|\/$/g, '');
  return normalizedLocale ? `/${normalizedLocale}${normalizedPath}` : normalizedPath;
}

function attributionSnapshot() {
  const visitorId = getId(window.localStorage, 'cheerdmoto_visitor_id', 'v');
  const sessionId = getId(window.sessionStorage, 'cheerdmoto_session_id', 's');
  const touch = classifyTraffic({
    url: window.location.href,
    referrer: document.referrer,
    locale: document.documentElement.lang || navigator.language,
    deviceType: /mobile|iphone|android/i.test(navigator.userAgent) ? 'Mobile' : /ipad|tablet/i.test(navigator.userAgent) ? 'Tablet' : 'Desktop',
    browser: navigator.userAgent
  });
  const firstTouch = readJson<TrafficTouch>(window.localStorage, 'traffic_first_touch') || touch;
  const storedLast = readJson<TrafficTouch>(window.localStorage, 'traffic_last_touch') || touch;
  return {
    visitorId,
    sessionId,
    firstTouch,
    lastTouch: isMeaningfulMarketingTouch(touch) || storedLast.channel === 'direct' ? touch : storedLast,
    sessionTouch: readJson<TrafficTouch>(window.sessionStorage, 'traffic_session') || touch
  };
}

export default function CheckoutForm({locale, productSlug, productName, productImage, unitPrice, quantity, shippingEstimate}: CheckoutFormProps) {
  const isOneTimePayment = productSlug === 'one-time-35';
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientRequestId, setClientRequestId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [country, setCountry] = useState('');
  const [billingMode, setBillingMode] = useState('same');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('oceanpayment_card');
  const [paymentScene, setPaymentScene] = useState<OceanpaymentScene>('3d');
  const [opScriptReady, setOpScriptReady] = useState(false);
  const [cardSdkReady, setCardSdkReady] = useState(false);
  const [forceSandboxPayment, setForceSandboxPayment] = useState(productSlug === 'payment-test');
  const cardScriptReady = opScriptReady && cardSdkReady;
  const activeShippingEstimate = country ? shippingEstimateFor(productSlug, country) : shippingEstimate;
  const total = unitPrice * quantity + activeShippingEstimate;
  const discount = useMemo(() => (!isOneTimePayment && coupon.trim().toUpperCase() === 'CHEERDMOTO' ? Math.round(total * 0.03) : 0), [coupon, isOneTimePayment, total]);
  const finalTotal = total - discount;

  useEffect(() => {
    const storageKey = `cheerdmoto-checkout-idem-${productSlug}-${quantity}`;
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) {
      setClientRequestId(existing);
      return;
    }
    const next = `idem-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    window.sessionStorage.setItem(storageKey, next);
    setClientRequestId(next);
  }, [productSlug, quantity]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setForceSandboxPayment(
      productSlug === 'payment-test' ||
      params.get('gateway') === 'sandbox' ||
      params.get('opEnv') === 'test' ||
      params.get('sandbox') === '1'
    );
  }, [productSlug]);

  useEffect(() => {
    if (!cardScriptReady || paymentMethod !== 'oceanpayment_card') return;
    const gatewayWindow = window as unknown as {
      Oceanpayment?: {
        init?: (testMode: boolean | '', secure3dUrl?: string, nonSecure3dUrl?: string) => void;
      };
    };
    if (!gatewayWindow.Oceanpayment?.init) return;
    const existingIframe = document.getElementById('oceanpayment-iframe-card') as HTMLIFrameElement | null;
    const iframeUsesSandbox = existingIframe?.src.includes('test-secure.oceanpayment.com') || false;
    if (existingIframe && iframeUsesSandbox === forceSandboxPayment) return;
    document.getElementById('oceanpayment-element')?.replaceChildren();
    gatewayWindow.Oceanpayment.init(forceSandboxPayment ? true : '', '', '');
    const iframe = document.getElementById('oceanpayment-iframe-card');
    iframe?.addEventListener('load', () => {
      iframe.dataset.ready = 'true';
    }, {once: true});
  }, [cardScriptReady, forceSandboxPayment, paymentMethod]);

  useEffect(() => {
    const win = window as unknown as {
      oceanpaymentCallBack?: (data: OceanpaymentCallbackData) => void;
    };
    win.oceanpaymentCallBack = (data) => {
      const payUrl = readOceanpaymentValue(data, 'pay_url') || readOceanpaymentValue(data, 'payUrl') || readOceanpaymentValue(data, 'redirect_url');
      const orderNumber = readOceanpaymentValue(data, 'order_number') || readOceanpaymentValue(data, 'orderNo');
      const paymentStatus = readOceanpaymentValue(data, 'payment_status') || readOceanpaymentValue(data, 'status');
      const message = readOceanpaymentValue(data, 'message') || readOceanpaymentValue(data, 'payment_details') || readOceanpaymentValue(data, 'error');

      if (payUrl) {
        setStatus('Oceanpayment 3D verification page opened. Please complete the payment there.');
        window.location.href = payUrl;
        return;
      }
      if (/^(1|success|paid|approved)$/i.test(paymentStatus) && orderNumber) {
        window.location.href = localizedUrl(locale, `/checkout/success?order=${encodeURIComponent(orderNumber)}&payment=oceanpayment`);
        return;
      }
      if (/^(2|3|-1|failed|fail|declined|cancelled|canceled|error|rejected)$/i.test(paymentStatus) && orderNumber) {
        window.location.href = localizedUrl(locale, `/checkout/failed?order=${encodeURIComponent(orderNumber)}&payment=failed`);
        return;
      }
      setStatus(message || 'Oceanpayment returned a payment response. If payment did not continue, please try again or contact CHEERDMOTO sales.');
      setIsSubmitting(false);
    };
    return () => {
      delete win.oceanpaymentCallBack;
    };
  }, [locale]);

  function submitOceanpayment(method: OceanpaymentTab, oceanpayment: OceanpaymentPayload) {
    const gatewayWindow = window as unknown as {
      Oceanpayment?: {
        init?: (testMode: boolean | '', secure3dUrl?: string, nonSecure3dUrl?: string) => void;
        checkout?: (fields: Record<string, string>) => void;
      };
      onePageGooglePay?: {checkout?: (fields: Record<string, string>) => void};
      onePageApplePay?: {checkout?: (fields: Record<string, string>) => void};
    };
    if (method === 'oceanpayment_google_pay' && gatewayWindow.onePageGooglePay?.checkout) {
      gatewayWindow.onePageGooglePay.checkout(oceanpayment.fields);
      return;
    }
    if (method === 'oceanpayment_apple_pay' && gatewayWindow.onePageApplePay?.checkout) {
      gatewayWindow.onePageApplePay.checkout(oceanpayment.fields);
      return;
    }
    if (method === 'oceanpayment_card' && gatewayWindow.Oceanpayment?.init && gatewayWindow.Oceanpayment.checkout) {
      const shouldUseSandbox = Boolean(oceanpayment.testMode);
      let iframe = document.getElementById('oceanpayment-iframe-card') as HTMLIFrameElement | null;
      const iframeUsesSandbox = iframe?.src.includes('test-secure.oceanpayment.com') || false;
      if (iframe && shouldUseSandbox !== iframeUsesSandbox) {
        document.getElementById('oceanpayment-element')?.replaceChildren();
        iframe = null;
      }
      if (!iframe) {
        gatewayWindow.Oceanpayment.init(oceanpayment.testMode ? true : '', '', '');
        iframe = document.getElementById('oceanpayment-iframe-card') as HTMLIFrameElement | null;
      }
      let submitted = false;
      const submitToIframe = () => {
        if (submitted) return;
        submitted = true;
        gatewayWindow.Oceanpayment?.checkout?.(oceanpayment.fields);
      };
      if (iframe?.dataset.ready === 'true') {
        submitToIframe();
      } else if (iframe) {
        iframe.addEventListener('load', () => window.setTimeout(submitToIframe, 250), {once: true});
        window.setTimeout(submitToIframe, 1800);
      } else {
        window.setTimeout(submitToIframe, 600);
      }
      return;
    }
    if (method === 'oceanpayment_card') {
      setStatus('Oceanpayment secure card script is still loading. Please wait a few seconds and click Pay now again.');
      return;
    }
    setStatus('This wallet payment script is still loading or not available on this device. Please try Credit Card or Bank transfer.');
  }

  function submitHostedOceanpayment(oceanpayment: OceanpaymentPayload) {
    if (!oceanpayment.gatewayUrl) {
      setStatus('Oceanpayment hosted payment URL is not configured. Please contact CHEERDMOTO sales.');
      setIsSubmitting(false);
      return;
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = oceanpayment.gatewayUrl;
    form.style.display = 'none';
    Object.entries(oceanpayment.fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  function watchOrderPayment(orderId: string) {
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, {
          headers: {'Accept': 'application/json'},
          cache: 'no-store'
        });
        if (response.ok) {
          const result = await response.json();
          const orderStatus = String(result.order?.orderStatus || result.order?.status || '');
          const paymentStatus = String(result.order?.paymentStatus || result.order?.gatewayStatus || '');
          if (/^(paid|processing|shipped|delivered|completed)$/i.test(orderStatus) || /^(success|processing)$/i.test(paymentStatus)) {
            window.location.href = localizedUrl(locale, `/checkout/success?order=${encodeURIComponent(orderId)}&payment=oceanpayment`);
            return;
          }
          if (/^(failed|cancelled|canceled)$/i.test(orderStatus) || /^failed$/i.test(paymentStatus)) {
            window.location.href = localizedUrl(locale, `/checkout/failed?order=${encodeURIComponent(orderId)}&payment=failed`);
            return;
          }
        }
      } catch {
        // Keep polling; transient account/session timing can happen right after order creation.
      }
      if (attempts < 20) {
        window.setTimeout(poll, 3000);
        return;
      }
      setStatus('Oceanpayment did not open or confirm in time. Please click Pay now again, or try another browser if the payment window was blocked.');
      setIsSubmitting(false);
    };
    window.setTimeout(poll, 3000);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus('Submitting project order details...');
    const formData = new FormData(event.currentTarget);
    const firstName = String(formData.get('firstName') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const country = String(formData.get('country') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const apartment = String(formData.get('apartment') || '').trim();
    const city = String(formData.get('city') || '').trim();
    const state = String(formData.get('state') || '').trim();
    const zip = String(formData.get('zip') || '').trim();
    const fullAddress = [address, apartment, city, state, zip].filter(Boolean).join(', ');
    const body = {
      productSlug,
      quantity,
      paymentMethod,
      idempotencyKey: clientRequestId,
      customer: {
        name: `${firstName} ${lastName}`.trim(),
        email: formData.get('contact'),
        phone: formData.get('phone'),
        company: '',
        country,
        address: fullAddress,
        message: formData.get('message')
      },
      checkout: {
        contact: formData.get('contact'),
        firstName,
        lastName,
        apartment,
        city,
        state,
        zip,
        shippingMethod: formData.get('shippingMethod'),
        couponCode: formData.get('couponCode'),
        marketingOptIn: formData.get('marketingOptIn') === 'on',
        billingSameAsShipping: billingMode === 'same',
        billingAddress: billingMode === 'same' ? fullAddress : formData.get('billingAddress'),
        cardBrand: '',
        cardLast4: '',
        cardholderName: ''
      },
      attribution: attributionSnapshot()
    };

    const response = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) {
      setStatus(result.message || 'Order submission failed. Please check required fields.');
      setIsSubmitting(false);
      return;
    }
    if (String(paymentMethod).startsWith('oceanpayment')) {
      setStatus(`Order ${result.order.id} created. Preparing Oceanpayment ${paymentScene.toUpperCase()} request...`);
      const paymentResponse = await fetch('/api/payments/oceanpayment/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({orderId: result.order.id, paymentMethod, scene: paymentScene, locale, checkoutUrl: window.location.href})
      });
      const paymentResult = await paymentResponse.json();
      if (!paymentResponse.ok) {
        setStatus(paymentResult.message || 'Oceanpayment request failed. Please contact CHEERDMOTO sales.');
        setIsSubmitting(false);
        return;
      }
      if (paymentResult.status === 'waiting_for_credentials') {
        setStatus(`Order ${result.order.id} saved. Oceanpayment credentials are not configured yet: ${paymentResult.oceanpayment.requiredEnv.join(', ')}.`);
        setIsSubmitting(false);
        return;
      }
      setStatus('Opening Oceanpayment secure payment window...');
      submitOceanpayment(paymentMethod as OceanpaymentTab, paymentResult.oceanpayment);
      watchOrderPayment(result.order.id);
      if (isOneTimePayment && paymentMethod === 'oceanpayment_card') {
        window.setTimeout(() => {
          setStatus('Opening Oceanpayment hosted payment page...');
          submitHostedOceanpayment(paymentResult.oceanpayment);
        }, 6000);
      }
      window.setTimeout(() => {
        setStatus('If no Oceanpayment window opened, please allow pop-ups/third-party payment frames and click Pay now again.');
        setIsSubmitting(false);
      }, isOneTimePayment ? 18000 : 15000);
      return;
    }
    setStatus(`Project order received: ${result.order.id}. CHEERDMOTO sales will confirm quotation, logistics and payment next.`);
    window.location.href = localizedUrl(locale, `/checkout/success?order=${encodeURIComponent(result.order.id)}`);
  }

  return (
    <form className="shopline-checkout" onSubmit={handleSubmit} aria-label="Project order form">
      <Script
        id="oceanpayment-core-sdk"
        src="https://secure.oceanpayment.com/pub/js/op.js"
        strategy="afterInteractive"
        onLoad={() => setOpScriptReady(true)}
      />
      <Script src="https://secure.oceanpayment.com/pub/js/jquery/jq.js" strategy="afterInteractive" />
      <Script
        id="oceanpayment-card-sdk"
        src="https://secure.oceanpayment.com/pages/js/oceanpayment.js"
        strategy="afterInteractive"
        onLoad={() => setCardSdkReady(true)}
      />
      <Script src="https://secure.oceanpayment.com/gateway/js/googlepay_ec.js" strategy="afterInteractive" />
      <Script src="https://secure.oceanpayment.com/gateway/js/applepay_ec.js" strategy="afterInteractive" />
      <div className="checkout-left">
        <section className="checkout-block">
          <div className="checkout-block-title">
            <h2>Contact</h2>
            <a href={localizedUrl(locale, '/support')}>Need help?</a>
          </div>
          <input name="contact" type="email" required placeholder="Email or mobile phone number" />
          <label className="checkout-checkbox">
            <input name="marketingOptIn" type="checkbox" defaultChecked />
            Receive product updates and quotation follow-up
          </label>
        </section>

        <section className="checkout-block">
          <h2>Delivery</h2>
          <label className="field-shell full">
            <span>Country / region</span>
            <select name="country" required value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="" disabled>Choose destination country</option>
              <option>South Africa</option>
              <option>Brazil</option>
              <option>Indonesia</option>
              <option>United States</option>
              <option>Saudi Arabia</option>
              <option>United Kingdom</option>
              <option>Canada</option>
              <option>Portugal</option>
              <option>Spain</option>
              <option>Other</option>
            </select>
          </label>
          <div className="checkout-two">
            <input name="firstName" required placeholder="First name" />
            <input name="lastName" required placeholder="Last name" />
          </div>
          <input name="address" required placeholder="Address" />
          <input name="apartment" placeholder="Apartment, suite, warehouse, port, etc." />
          <div className="checkout-three">
            <input name="city" required placeholder="City" />
            <input name="state" placeholder="State / province" />
            <input name="zip" required placeholder="ZIP / postal code" />
          </div>
          <input name="phone" required pattern="^[+0-9 ()-]{6,24}$" placeholder="Phone / WhatsApp" />
        </section>

        <section className="checkout-block">
          <h2>Shipping method</h2>
          <label className="checkout-method">
            <input name="shippingMethod" type="radio" value="standard_ocean_air_quote" defaultChecked />
            <span>
              <strong>Standard sea / air freight quotation</strong>
              <small>Sales team confirms final logistics cost by destination, quantity and packaging.</small>
            </span>
            <b>USD {activeShippingEstimate.toLocaleString()}</b>
          </label>
          <label className="checkout-method">
            <input name="shippingMethod" type="radio" value="factory_pickup_forwarder" />
            <span>
              <strong>Buyer forwarder pickup</strong>
              <small>Use your own forwarder for factory pickup or export handoff.</small>
            </span>
            <b>Quote</b>
          </label>
        </section>

        <section className="checkout-block payment-block">
          <h2>Payment</h2>
          <p className="checkout-help">All transactions are secure and encrypted.</p>
          <input name="paymentMethod" type="hidden" value={paymentMethod} />
          <input name="paymentScene" type="hidden" value={paymentScene} />
          <div className="shopline-payment-box" role="group" aria-label="Oceanpayment secure payment">
            <button
              type="button"
              className={`shopline-payment-row shopline-payment-card ${paymentMethod === 'oceanpayment_card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('oceanpayment_card')}
              aria-pressed={paymentMethod === 'oceanpayment_card'}
            >
              <span className="payment-row-left">
                <span className="payment-radio-dot" aria-hidden="true" />
                <strong>Credit Card</strong>
              </span>
              <span className="card-brand-row" role="group" aria-label="Supported card brands">
                {cardBadges.map((badge) => <b key={badge}>{badge}</b>)}
              </span>
            </button>
            {paymentMethod === 'oceanpayment_card' ? (
              <div className="shopline-card-fields">
                <div id="oceanpayment-element" className="oceanpayment-card-element" role="group" aria-label="Oceanpayment secure card form" />
                <p className="payment-safe-note">Enter card details in the Oceanpayment secure card form. CHEERDMOTO does not store full card numbers or CVV.</p>
              </div>
            ) : null}
            <button
              type="button"
              className={`shopline-payment-row ${paymentMethod === 'oceanpayment_google_pay' || paymentMethod === 'oceanpayment_apple_pay' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('oceanpayment_google_pay')}
              aria-pressed={paymentMethod === 'oceanpayment_google_pay' || paymentMethod === 'oceanpayment_apple_pay'}
            >
              <span className="payment-row-left">
                <span className="payment-radio-dot" aria-hidden="true" />
                <strong>Multiple payments</strong>
              </span>
              <span className="payment-icon-strip" role="group" aria-label="Wallet and alternative payment methods">
                {multiplePaymentBadges.map((badge) => <b key={badge}>{badge}</b>)}
              </span>
            </button>
          </div>
          {paymentMethod === 'oceanpayment_google_pay' || paymentMethod === 'oceanpayment_apple_pay' ? (
            <div className="oceanpayment-panel wallet-panel">
              <strong>Oceanpayment wallet checkout</strong>
              <p>Click Pay now to open the Oceanpayment wallet or local payment page. Available methods depend on buyer country and device support.</p>
              <div className="wallet-choice-row">
                <button type="button" className={paymentMethod === 'oceanpayment_google_pay' ? 'active' : ''} onClick={() => setPaymentMethod('oceanpayment_google_pay')}>Google Pay</button>
                <button type="button" className={paymentMethod === 'oceanpayment_apple_pay' ? 'active' : ''} onClick={() => setPaymentMethod('oceanpayment_apple_pay')}>Apple Pay</button>
              </div>
            </div>
          ) : null}
          {String(paymentMethod).startsWith('oceanpayment') ? (
            <div className="oceanpayment-scenes" role="group" aria-label="3D payment scene">
              <button type="button" className={paymentScene === '3d' ? 'active' : ''} onClick={() => setPaymentScene('3d')}>3D Secure</button>
              <button type="button" className={paymentScene === 'non-3d' ? 'active' : ''} onClick={() => setPaymentScene('non-3d')}>Non-3D</button>
            </div>
          ) : null}
          {!isOneTimePayment ? (
            <label className="checkout-method">
              <input type="radio" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} />
              <span>
                <strong>Bank transfer / T/T</strong>
                <small>Receive proforma invoice and bank details from CHEERDMOTO sales.</small>
              </span>
            </label>
          ) : null}
        </section>

        <section className="checkout-block">
          <h2>Billing address</h2>
          <label className="checkout-method">
            <input name="billingMode" type="radio" value="same" checked={billingMode === 'same'} onChange={() => setBillingMode('same')} />
            <span><strong>Same as shipping address</strong></span>
          </label>
          <label className="checkout-method">
            <input name="billingMode" type="radio" value="different" checked={billingMode === 'different'} onChange={() => setBillingMode('different')} />
            <span><strong>Use a different billing address</strong></span>
          </label>
          {billingMode === 'different' ? <textarea name="billingAddress" placeholder="Billing name, address, tax ID or VAT details" /> : null}
          <textarea name="message" placeholder="Order notes, delivery plan, packaging request, color, accessories or customization needs." />
        </section>
      </div>

      <aside className="shopline-summary">
        <div className="summary-product">
          <div className="summary-image-wrap">
            <img src={productImage} alt={`${productName} checkout thumbnail`} />
            <span>{quantity}</span>
          </div>
          <div>
            <h3>{productName}</h3>
            <p>Commercial water sports equipment project</p>
          </div>
          <strong>USD {(unitPrice * quantity).toLocaleString()}</strong>
        </div>
        {!isOneTimePayment ? (
          <div className="coupon-row">
            <input name="couponCode" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Coupon code" />
            <button type="button">Apply</button>
          </div>
        ) : null}
        <dl className="summary-totals">
          <div><dt>Subtotal</dt><dd>USD {(unitPrice * quantity).toLocaleString()}</dd></div>
          <div><dt>Shipping</dt><dd>USD {activeShippingEstimate.toLocaleString()}</dd></div>
          {discount ? <div><dt>Discount</dt><dd>- USD {discount.toLocaleString()}</dd></div> : null}
          <div className="summary-total"><dt>Estimated total</dt><dd><small>USD</small> {finalTotal.toLocaleString()}</dd></div>
        </dl>
        <button className="button primary checkout-pay-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Pay now'}
        </button>
        <p className="form-note">{status || 'After submission, CHEERDMOTO sales will confirm final quotation, logistics and payment method before any charge.'}</p>
      </aside>
    </form>
  );
}

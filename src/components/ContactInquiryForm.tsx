'use client';

import {useState} from 'react';
import {classifyTraffic, isMeaningfulMarketingTouch, type TrafficTouch} from '@/lib/trafficAttribution';

type ContactInquiryFormProps = {
  copy: {
    fields: {
      name: string;
      email: string;
      phone: string;
      company: string;
      country: string;
      buyerType: string;
      product: string;
      quantity: string;
      market: string;
      message: string;
      submit: string;
    };
    buyerTypes: string[];
    productOptions: string[];
  };
};

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

function attributionSnapshot(visitorId: string, sessionId: string) {
  const touch = classifyTraffic({
    url: window.location.href,
    referrer: document.referrer,
    locale: document.documentElement.lang || navigator.language,
    deviceType: /mobile|iphone|android/i.test(navigator.userAgent) ? 'Mobile' : /ipad|tablet/i.test(navigator.userAgent) ? 'Tablet' : 'Desktop',
    browser: navigator.userAgent
  });
  const firstTouch = readJson<TrafficTouch>(window.localStorage, 'traffic_first_touch') || touch;
  const storedLast = readJson<TrafficTouch>(window.localStorage, 'traffic_last_touch') || touch;
  const lastTouch = isMeaningfulMarketingTouch(touch) || storedLast.channel === 'direct' ? touch : storedLast;
  return {
    visitorId,
    sessionId,
    firstTouch,
    lastTouch,
    sessionTouch: readJson<TrafficTouch>(window.sessionStorage, 'traffic_session') || touch
  };
}

export default function ContactInquiryForm({copy}: ContactInquiryFormProps) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/contact/inquiry', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...body,
          visitorId: getId(window.localStorage, 'cheerdmoto_visitor_id', 'v'),
          sessionId: getId(window.sessionStorage, 'cheerdmoto_session_id', 's'),
          page: window.location.pathname,
          referrer: document.referrer,
          attribution: attributionSnapshot(
            getId(window.localStorage, 'cheerdmoto_visitor_id', 'v'),
            getId(window.sessionStorage, 'cheerdmoto_session_id', 's')
          )
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(result.message || 'Submission failed. Please try again.');
        return;
      }
      form.reset();
      setStatus(result.message || 'Thank you. We received your request.');
    } catch {
      setStatus('Network error. Please try again or email support@cheerdmotos.com.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="inquiry-form"
      onSubmit={handleSubmit}
    >
      <label>
        <span>{copy.fields.name}</span>
        <input name="name" required placeholder="Your name" autoComplete="name" />
      </label>
      <label>
        <span>{copy.fields.email}</span>
        <input name="email" required type="email" placeholder="name@company.com" autoComplete="email" />
      </label>
      <label>
        <span>{copy.fields.phone}</span>
        <input name="phone" required type="tel" placeholder="+1 555 000 0000" autoComplete="tel" />
      </label>
      <label>
        <span>{copy.fields.country}</span>
        <input name="country" required placeholder="UAE, United States, Spain..." autoComplete="country-name" />
      </label>
      <label>
        <span>{copy.fields.buyerType}</span>
        <select name="buyerType" required defaultValue="">
          <option value="" disabled>Select buyer type</option>
          {copy.buyerTypes.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span>{copy.fields.product}</span>
        <select name="product" required defaultValue="">
          <option value="" disabled>Select product</option>
          {copy.productOptions.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>
      <label className="full">
        <span>{copy.fields.message}</span>
        <textarea name="message" required rows={5} placeholder="Quantity, application scenario, shipment plan, branding needs..." />
      </label>
      <details className="form-more full">
        <summary>More Project Details</summary>
        <div className="advanced-fields">
          <label>
            <span>{copy.fields.company}</span>
            <input name="company" placeholder="Company name" autoComplete="organization" />
          </label>
          <label>
            <span>{copy.fields.quantity}</span>
            <input name="quantity" placeholder="1 sample / 5 units / 20 units..." />
          </label>
          <label>
            <span>{copy.fields.market}</span>
            <input name="targetMarket" placeholder="USA, Canada, Europe, dealer region..." />
          </label>
          <label>
            <span>Water area type</span>
            <input name="waterArea" placeholder="Trail / city / warehouse / daily mobility use..." />
          </label>
          <label>
            <span>OEM/ODM requirement</span>
            <input name="oem" placeholder="Logo, color, packaging..." />
          </label>
          <label>
            <span>Shipping destination port</span>
            <input name="destinationPort" placeholder="Los Angeles / Jebel Ali / Barcelona..." />
          </label>
        </div>
      </details>
      <input name="website" tabIndex={-1} autoComplete="off" className="form-trap" aria-hidden="true" />
      <button className="button primary" disabled={busy} type="submit">
        {busy ? 'Sending...' : copy.fields.submit}
      </button>
      {status && <p className="form-status full" role="status" aria-live="polite">{status}</p>}
    </form>
  );
}

'use client';

import {useEffect, useRef} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {classifyTraffic, isMeaningfulMarketingTouch, type AttributionSnapshot, type TrafficTouch} from '@/lib/trafficAttribution';

function getId(storage: Storage, key: string, prefix: string) {
  let value = storage.getItem(key);
  if (!value) {
    value = `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    storage.setItem(key, value);
  }
  return value;
}

function sendEvent(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/track', new Blob([body], {type: 'application/json'}));
    return;
  }
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
    keepalive: true
  }).catch(() => {});
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

function setCookie(name: string, value: string, maxAgeDays: number) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeDays * 86400}; SameSite=Lax${secure}`;
}

function safeLinkTarget(link: HTMLAnchorElement) {
  const href = link.getAttribute('href') || '';
  if (href.startsWith('mailto:')) return 'email';
  if (href.startsWith('tel:')) return 'phone';
  if (/whatsapp/i.test(href)) return 'whatsapp';
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin ? url.pathname : url.hostname;
  } catch {
    return '';
  }
}

function readAttribution(visitorId: string, sessionId: string, page: string): AttributionSnapshot {
  const now = new Date().toISOString();
  const touch = classifyTraffic({
    url: window.location.href,
    referrer: document.referrer,
    locale: document.documentElement.lang || navigator.language,
    deviceType: /mobile|iphone|android/i.test(navigator.userAgent) ? 'Mobile' : /ipad|tablet/i.test(navigator.userAgent) ? 'Tablet' : 'Desktop',
    browser: navigator.userAgent,
    now
  });
  const first = readJson<TrafficTouch>(window.localStorage, 'traffic_first_touch') || touch;
  const lastStored = readJson<TrafficTouch>(window.localStorage, 'traffic_last_touch') || touch;
  const last = isMeaningfulMarketingTouch(touch) || !lastStored || lastStored.channel === 'direct' ? touch : lastStored;
  const session = readJson<TrafficTouch>(window.sessionStorage, 'traffic_session') || {...touch, landingPage: page};
  writeJson(window.localStorage, 'traffic_first_touch', first);
  writeJson(window.localStorage, 'traffic_last_touch', last);
  writeJson(window.sessionStorage, 'traffic_session', session);
  setCookie('anonymous_visitor_id', visitorId, 365);
  setCookie('traffic_first_touch', JSON.stringify(first), 365);
  setCookie('traffic_last_touch', JSON.stringify(last), 90);
  setCookie('traffic_session', JSON.stringify(session), 1);
  return {visitorId, sessionId, firstTouch: first, lastTouch: last, sessionTouch: session};
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPage = useRef('');

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    const page = `${pathname || '/'}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    if (previousPage.current === page) return;
    const visitorId = getId(window.localStorage, 'cheerdmoto_visitor_id', 'v');
    const sessionId = getId(window.sessionStorage, 'cheerdmoto_session_id', 's');
    const attribution = readAttribution(visitorId, sessionId, page);
    const base = {
      visitorId,
      sessionId,
      page,
      previousPage: previousPage.current,
      pageTitle: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      language: document.documentElement.lang || navigator.language,
      screen: `${window.screen.width}x${window.screen.height}`,
      attribution
    };
    sendEvent({...base, type: 'page_view'});
    if (pathname?.includes('/products/')) sendEvent({...base, type: 'product_view'});
    if (pathname?.includes('/checkout')) sendEvent({...base, type: 'checkout_start'});
    previousPage.current = page;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return undefined;

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      if (!link) return;
      const text = link.textContent?.trim().slice(0, 120) || '';
      const targetKind = safeLinkTarget(link);
      if (/buy now|checkout|quote|whatsapp|get project quote|contact|send/i.test(text) || ['email', 'phone', 'whatsapp'].includes(targetKind)) {
        const visitorId = getId(window.localStorage, 'cheerdmoto_visitor_id', 'v');
        const sessionId = getId(window.sessionStorage, 'cheerdmoto_session_id', 's');
        sendEvent({
          type: 'commerce_click',
          visitorId,
          sessionId,
          page: window.location.pathname,
          pageTitle: document.title,
          targetText: text,
          targetKind,
          language: document.documentElement.lang || navigator.language,
          timestamp: new Date().toISOString(),
          attribution: readAttribution(visitorId, sessionId, window.location.pathname)
        });
      }
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  return null;
}

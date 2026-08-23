import {appendAnalyticsEvent, type AnalyticsEvent} from '@/lib/commerceStore';
import {appendStoreLine} from '@/lib/durableStore';
import {classifyTraffic, compactAttribution} from '@/lib/trafficAttribution';
import {fingerprintIp, maskIp} from '@/lib/analyticsGovernance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EVENT_TYPES = new Set([
  'page_view',
  'product_view',
  'view_item',
  'select_item',
  'add_to_cart',
  'begin_checkout',
  'select_variant',
  'purchase',
  'checkout_start',
  'checkout_submit',
  'checkout_duplicate_submit',
  'commerce_click',
  'contact_inquiry',
  'payment_request_create',
  'payment_return',
  'payment_notice',
  'admin_order_shipment',
  'admin_order_refund',
  'admin_order_authorization'
]);

const SENSITIVE_KEYS = /email|phone|name|message|address|contact|cardholder|token|password|secret/i;

function clean(value: unknown, limit = 240) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, limit);
}

function isBot(userAgent = '') {
  return /bot|crawler|spider|crawling|lighthouse|pagespeed|headless|vercel|uptime|monitor|preview|facebookexternalhit|slurp|bingpreview/i.test(userAgent);
}

function isTestRequest(request: Request, payload: Record<string, unknown>) {
  const host = request.headers.get('host') || '';
  const page = clean(payload.page || '/', 240);
  return host.includes('localhost') || host.endsWith('.vercel.app') || /(?:[?&])(?:__test|_test|test|test_mode|form_health_check|collect|collects|preview)(?:=|&|$)/i.test(page) || payload.analyticsTest === true;
}

function safeEventType(value: unknown) {
  const type = clean(value, 80);
  return EVENT_TYPES.has(type) ? type : 'custom_event';
}

function sanitizePayload(payload: Record<string, unknown>) {
  const allowed = [
    'type',
    'page',
    'previousPage',
    'pageTitle',
    'language',
    'screen',
    'targetText',
    'targetKind',
    'productSlug',
    'item_id',
    'item_name',
    'item_category',
    'item_variant',
    'paymentMethod',
    'cardBrand',
    'buyerType',
    'product',
    'price',
    'currency',
    'quantity',
    'country',
    'utmSource',
    'utmMedium',
    'utmCampaign'
  ];
  return Object.fromEntries(
    allowed
      .filter((key) => key in payload && !SENSITIVE_KEYS.test(key))
      .map((key) => [key, typeof payload[key] === 'number' || typeof payload[key] === 'boolean' ? payload[key] : clean(payload[key], 180)])
  );
}

function detectDevice(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'Tablet';
  if (/mobile|iphone|android/.test(ua)) return 'Mobile';
  return 'Desktop';
}

function detectBrowser(userAgent = '') {
  if (/edg/i.test(userAgent)) return 'Edge';
  if (/chrome|crios/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'Safari';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  return 'Other';
}

function detectOs(userAgent = '') {
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/iphone|ipad|ios/i.test(userAgent)) return 'iOS';
  if (/android/i.test(userAgent)) return 'Android';
  if (/mac os|macintosh/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Other';
}

function clientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  ).slice(0, 80);
}

function normalizePayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Invalid analytics payloads fall through to the normal validation response.
    }
  }
  return {};
}

export async function POST(request: Request) {
  try {
    const payload = normalizePayload(await request.json());
    if (!payload.type || !payload.visitorId || !payload.sessionId) {
      return Response.json({ok: false, message: 'Invalid analytics payload'}, {status: 400});
    }
    const userAgent = request.headers.get('user-agent') || '';
    if (isBot(userAgent)) {
      await appendStoreLine('analytics-exclusions.jsonl', {id: `excluded-${Date.now()}`, at: new Date().toISOString(), reason: 'bot', page: clean(payload.page || '/', 240)});
      return Response.json({ok: true, skipped: 'bot'});
    }
    if (isTestRequest(request, payload)) {
      await appendStoreLine('analytics-exclusions.jsonl', {id: `excluded-${Date.now()}`, at: new Date().toISOString(), reason: 'test', page: clean(payload.page || '/', 240)});
      return Response.json({ok: true, skipped: 'test'});
    }
    const safePayload = sanitizePayload(payload);
    const attribution = compactAttribution(payload.attribution) || {
      visitorId: clean(payload.visitorId || 'anonymous', 80),
      sessionId: clean(payload.sessionId || 'session', 80),
      firstTouch: classifyTraffic({url: clean(payload.page || '/', 240), referrer: clean(payload.referrer || '', 240)}),
      lastTouch: classifyTraffic({url: clean(payload.page || '/', 240), referrer: clean(payload.referrer || '', 240)}),
      sessionTouch: classifyTraffic({url: clean(payload.page || '/', 240), referrer: clean(payload.referrer || '', 240)})
    };
    const event: AnalyticsEvent = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: safeEventType(payload.type || 'page_view'),
      visitorId: clean(payload.visitorId || 'anonymous', 80),
      sessionId: clean(payload.sessionId || 'session', 80),
      page: clean(payload.page || '/', 240),
      pageTitle: clean(payload.pageTitle || '', 180),
      referrer: clean(payload.referrer || '', 240),
      country: request.headers.get('x-vercel-ip-country') || 'Unknown',
      city: request.headers.get('x-vercel-ip-city') || '',
      device: detectDevice(userAgent),
      browser: detectBrowser(userAgent),
      os: detectOs(userAgent),
      ip: maskIp(clientIp(request)),
      ipHash: fingerprintIp(clientIp(request)),
      trafficQuality: 'real',
      timestamp: clean(payload.timestamp || new Date().toISOString(), 40),
      payload: safePayload,
      attribution
    };
    await appendAnalyticsEvent(event);
    return Response.json({ok: true});
  } catch (error) {
    console.error('Analytics tracking failed', error);
    return Response.json({ok: false}, {status: 400});
  }
}

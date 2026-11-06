import {appendAnalyticsEvent} from '@/lib/commerceStore';
import {deliverContactInquiry, saveContactInquiry} from '@/lib/contactInquiries';
import {persistentWritesAvailable} from '@/lib/durableStore';
import {checkRateLimit, clientIp} from '@/lib/rateLimit';
import {classifyTraffic, compactAttribution} from '@/lib/trafficAttribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value: unknown, limit = 300) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, limit);
}

function textarea(value: unknown, limit = 1200) {
  return String(value || '').trim().slice(0, limit);
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

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const test = request.headers.get('x-cowin-health-check') === '1' &&
    Boolean(secret ? request.headers.get('authorization') === `Bearer ${secret}` : process.env.NODE_ENV !== 'production');
  if (!test && !checkRateLimit(`contact-inquiry:${clientIp(request)}`, 8, 10 * 60_000)) {
    return Response.json({message: 'Too many inquiries. Please try again later.'}, {status: 429});
  }

  try {
    if (!persistentWritesAvailable()) return Response.json({message: 'The form is temporarily unavailable. Please email info@cheerdmotos.com.'}, {status: 503});
    const payload = await request.json().catch(() => ({}));
    if (clean(payload.website, 80)) {
      return Response.json({ok: true, message: 'Thank you. We received your request.'});
    }

    const inquiry = {
      name: clean(payload.name, 120),
      email: clean(payload.email, 160).toLowerCase(),
      phone: clean(payload.phone, 80),
      country: clean(payload.country, 120),
      company: clean(payload.company, 160),
      buyerType: clean(payload.buyerType, 120),
      product: clean(payload.product, 160),
      quantity: clean(payload.quantity, 80),
      targetMarket: clean(payload.targetMarket, 160),
      waterArea: clean(payload.waterArea, 160),
      oem: clean(payload.oem, 200),
      destinationPort: clean(payload.destinationPort, 160),
      message: textarea(payload.message)
    };

    if (!inquiry.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email) || !inquiry.phone || !inquiry.country || !inquiry.buyerType || !inquiry.product || !inquiry.message) {
      return Response.json({message: 'Please complete the required fields.'}, {status: 400});
    }

    const page = clean(payload.page || '/support', 240);
    const {inquiry: record, created} = await saveContactInquiry(inquiry, {requestId: clean(payload.requestId, 100), page, test});
    const eventId = record.id;
    const userAgent = request.headers.get('user-agent') || '';
    const attribution = compactAttribution(payload.attribution) || {
      visitorId: clean(payload.visitorId || 'contact-inquiry', 80),
      sessionId: clean(payload.sessionId || eventId, 80),
      firstTouch: classifyTraffic({url: clean(payload.page || '/contact', 240), referrer: clean(payload.referrer, 240)}),
      lastTouch: classifyTraffic({url: clean(payload.page || '/contact', 240), referrer: clean(payload.referrer, 240)}),
      sessionTouch: classifyTraffic({url: clean(payload.page || '/contact', 240), referrer: clean(payload.referrer, 240)})
    };
    if (created && !test) await appendAnalyticsEvent({
      id: eventId,
      type: 'contact_inquiry',
      visitorId: clean(payload.visitorId || 'contact-inquiry', 80),
      sessionId: eventId,
      page,
      pageTitle: 'Contact inquiry',
      referrer: clean(payload.referrer, 240),
      country: inquiry.country || request.headers.get('x-vercel-ip-country') || 'Unknown',
      city: request.headers.get('x-vercel-ip-city') || '',
      device: detectDevice(userAgent),
      browser: detectBrowser(userAgent),
      os: detectOs(userAgent),
      ip: clientIp(request),
      timestamp: new Date().toISOString(),
      attribution,
      payload: {
        buyerType: inquiry.buyerType,
        product: inquiry.product,
        quantity: inquiry.quantity,
        country: inquiry.country,
        targetMarket: inquiry.targetMarket,
        waterArea: inquiry.waterArea,
        oem: inquiry.oem ? 'yes' : '',
        destinationPort: inquiry.destinationPort ? 'provided' : ''
      }
    }).catch(() => console.error('[inquiry] analytics write failed', eventId));

    const delivery = await deliverContactInquiry(eventId).catch(() => null);
    const emailStatus = delivery?.delivery.status || record.delivery.status;

    return Response.json({
      ok: true,
      id: eventId,
      emailStatus,
      message: `Thank you. We saved your request. Your reference is ${eventId}.`
    });
  } catch (error) {
    console.error('Contact inquiry failed', error);
    return Response.json({message: 'Inquiry submission failed. Please try again.'}, {status: 500});
  }
}

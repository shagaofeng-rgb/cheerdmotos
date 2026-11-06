import {clearTestInquiry} from '@/lib/contactInquiries';
import {siteUrl} from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ok: false, error: 'Unauthorized'}, {status: 401});
  }

  const origin = process.env.VERCEL_ENV === 'production' ? siteUrl : new URL(request.url).origin;
  const checkedAt = new Date().toISOString();
  const notificationEmail = 'info@cheerdmotos.com';
  const payload = {
    name: 'COWIN Semi-Monthly Contact Form Health Check',
    email: 'semi-monthly-form-check@cheerdmotos.com',
    phone: '+86 17621485205',
    country: 'Automated Test',
    company: 'COWIN Website Monitor',
    buyerType: 'Website health check',
    product: 'Contact form email delivery test',
    quantity: '1 semi-monthly test',
    targetMarket: 'Internal operations',
    waterArea: 'N/A',
    oem: 'No',
    destinationPort: 'N/A',
    message: `Automated semi-monthly contact form test. If this email arrives at ${notificationEmail}, the website form email delivery path is working. Checked at ${checkedAt}.`,
    page: '/en/contact?form_health_check=1',
    referrer: 'vercel-cron',
    visitorId: 'semi-monthly-contact-form-health-check',
    sessionId: `semi-monthly-contact-form-health-check-${checkedAt.slice(0, 10)}`,
    website: '',
    requestId: `scheduled-health-check-${checkedAt.slice(0, 10)}`
  };

  try {
    const response = await fetch(`${origin}/api/contact/inquiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cowin-health-check': '1',
        ...(process.env.CRON_SECRET ? {authorization: `Bearer ${process.env.CRON_SECRET}`} : {}),
        'User-Agent': 'COWIN-Monthly-Contact-Form-Health-Check/1.0'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    const emailStatus = typeof result.emailStatus === 'string' ? result.emailStatus : 'unknown';
    const ok = response.ok && emailStatus === 'sent';
    if (typeof result.id === 'string' && result.id.startsWith('contact-test-')) await clearTestInquiry(result.id);
    console.info('[contact-form-health-check]', {ok, endpointStatus: response.status, emailStatus, checkedAt});

    return Response.json(
      {
        ok,
        checkedAt,
        endpointStatus: response.status,
        emailStatus,
        inquiryId: result.id || '',
        message: ok ? 'Semi-monthly contact form email test sent.' : 'Semi-monthly contact form email test did not complete successfully.',
        result
      },
      {status: ok ? 200 : 500}
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        checkedAt,
        error: error instanceof Error ? error.message : 'Unknown contact form health check error'
      },
      {status: 500}
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ok: false, error: 'Unauthorized'}, {status: 401});
  }

  const origin = new URL(request.url).origin;
  const checkedAt = new Date().toISOString();
  const notificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_FROM || 'support@cheerdmotos.com';
  const payload = {
    name: 'CHEERDMOTO Semi-Monthly Contact Form Health Check',
    email: 'semi-monthly-form-check@cheerdmotos.com',
    phone: '+86 17621485205',
    country: 'Automated Test',
    company: 'CHEERDMOTO Website Monitor',
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
    website: ''
  };

  try {
    const response = await fetch(`${origin}/api/contact/inquiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CHEERDMOTO-Monthly-Contact-Form-Health-Check/1.0'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    const emailStatus = typeof result.emailStatus === 'string' ? result.emailStatus : 'unknown';
    const ok = response.ok && emailStatus === 'sent';

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

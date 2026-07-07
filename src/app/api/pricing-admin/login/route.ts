import {cookies} from 'next/headers';
import {checkRateLimit, clientIp} from '@/lib/rateLimit';
import {createPricingAdminSession, pricingAdminCookieOptions, PRICING_ADMIN_COOKIE, verifyPricingAdminCredentials} from '@/lib/pricingAdminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!checkRateLimit(`pricing-admin-login:${clientIp(request)}`, 8, 10 * 60_000)) {
    return Response.redirect(new URL('/pricing-admin/login?error=rate-limit', request.url), 303);
  }
  const formData = await request.formData();
  const email = String(formData.get('email') || formData.get('account') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  if (!verifyPricingAdminCredentials(email, password)) {
    return Response.redirect(new URL('/pricing-admin/login?error=1', request.url), 303);
  }
  const cookieStore = await cookies();
  cookieStore.set(PRICING_ADMIN_COOKIE, createPricingAdminSession(email), pricingAdminCookieOptions());
  return Response.redirect(new URL('/pricing-admin', request.url), 303);
}

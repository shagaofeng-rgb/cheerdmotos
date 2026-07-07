import {cookies} from 'next/headers';
import {adminCookieOptions, ADMIN_COOKIE_NAME, createAdminSession, verifyAdminCredentials} from '@/lib/adminAuth';
import {checkRateLimit, clientIp} from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!checkRateLimit(`admin-login:${clientIp(request)}`, 8, 10 * 60_000)) {
    return Response.redirect(new URL('/admin/login?error=rate-limit', request.url), 303);
  }
  const contentType = request.headers.get('content-type') || '';
  let email = '';
  let password = '';

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => ({}));
    email = String(payload.email || '');
    password = String(payload.password || '');
  } else {
    const formData = await request.formData();
    email = String(formData.get('email') || '');
    password = String(formData.get('password') || '');
  }

  if (!verifyAdminCredentials(email, password)) {
    return Response.redirect(new URL('/admin/login?error=1', request.url), 303);
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createAdminSession(email), adminCookieOptions());
  return Response.redirect(new URL('/admin', request.url), 303);
}

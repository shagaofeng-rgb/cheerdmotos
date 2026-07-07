import {createCustomerToken, findCustomerUserByEmail} from '@/lib/customerAuth';
import {sendPasswordResetEmail} from '@/lib/emailService';
import {checkRateLimit, clientIp} from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!checkRateLimit(`account-forgot:${clientIp(request)}`, 5, 10 * 60_000)) {
    return Response.json({message: 'Too many reset requests. Please try again later.'}, {status: 429});
  }
  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || '').trim().toLowerCase();
  if (email) {
    const user = await findCustomerUserByEmail(email);
    if (user) {
      const token = await createCustomerToken(user, 'password_reset');
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
      await sendPasswordResetEmail(user.email, `${baseUrl}/account/reset-password?token=${encodeURIComponent(token)}`);
    }
  }
  return Response.json({ok: true, message: 'If the email exists, a reset link has been sent.'});
}

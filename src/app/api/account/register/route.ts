import {createCustomerToken, createOrUpdateCustomerUser, findCustomerUserByEmail} from '@/lib/customerAuth';
import {sendPasswordResetEmail} from '@/lib/emailService';
import {checkRateLimit, clientIp} from '@/lib/rateLimit';
import {persistentWritesAvailable} from '@/lib/durableStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value: unknown, limit = 180) {
  return String(value || '').trim().slice(0, limit);
}

export async function POST(request: Request) {
  if (!checkRateLimit(`account-register:${clientIp(request)}`, 5, 10 * 60_000)) {
    return Response.json({message: 'Too many registration attempts. Please try again later.'}, {status: 429});
  }
  const payload = await request.json().catch(() => ({}));
  const email = clean(payload.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({message: 'Please enter a valid email.'}, {status: 400});
  }
  if (!persistentWritesAvailable()) return Response.json({message: 'Account registration is temporarily unavailable.'}, {status: 503});
  const existing = await findCustomerUserByEmail(email);
  if (!existing?.ownershipConfirmedAt) {
    const user = existing || await createOrUpdateCustomerUser({email, name: email});
    const token = await createCustomerToken(user, 'password_setup');
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
    const sent = await sendPasswordResetEmail(user.email, `${baseUrl}/account/reset-password?token=${encodeURIComponent(token)}`, true);
    if (!sent) return Response.json({message: 'We could not send the verification email. Please try again later.'}, {status: 503});
  }
  return Response.json({ok: true, message: 'Check your inbox for a verification link. If your account is already verified, sign in or request a password reset.'});
}

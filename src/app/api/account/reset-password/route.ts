import {cookies} from 'next/headers';
import {consumeCustomerToken, createCustomerSession, customerCookieOptions} from '@/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const token = String(payload.token || '').trim();
  const password = String(payload.password || '');
  const confirmPassword = String(payload.confirmPassword || '');
  if (!token || password.length < 8 || password !== confirmPassword) {
    return Response.json({message: 'Valid token and matching passwords of at least 8 characters are required.'}, {status: 400});
  }
  const user = await consumeCustomerToken(token, password);
  if (!user) return Response.json({message: 'Reset link expired or invalid.'}, {status: 400});
  const cookieStore = await cookies();
  cookieStore.set('cheerdmoto_customer_session', createCustomerSession(user), customerCookieOptions());
  return Response.json({ok: true, user: {id: user.id, email: user.email, name: user.name}});
}

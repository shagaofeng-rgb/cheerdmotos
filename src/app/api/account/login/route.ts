import {cookies} from 'next/headers';
import {bindOrdersToCustomer, createCustomerSession, customerCookieOptions, findCustomerUserByEmail, verifyCustomerCredentials} from '@/lib/customerAuth';
import {checkRateLimit, clientIp} from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!checkRateLimit(`account-login:${clientIp(request)}`, 10, 10 * 60_000)) {
    return Response.json({message: 'Too many login attempts. Please try again later.'}, {status: 429});
  }
  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({message: 'Please enter a valid email.'}, {status: 400});
  }
  if (!password) {
    return Response.json({message: 'Please enter your password.'}, {status: 400});
  }
  const existingUser = await findCustomerUserByEmail(email);
  if (existingUser && !existingUser.passwordHash) {
    return Response.json({message: 'This email has checkout orders but no password yet. Please create an account password first.'}, {status: 401});
  }
  const user = await verifyCustomerCredentials(email, password);
  if (!user) return Response.json({message: 'Invalid email or password.'}, {status: 401});
  await bindOrdersToCustomer(email, user.id);
  const cookieStore = await cookies();
  cookieStore.set('cheerdmoto_customer_session', createCustomerSession(user), customerCookieOptions());
  return Response.json({ok: true, isNewUser: false, user: {id: user.id, email: user.email, name: user.name}});
}

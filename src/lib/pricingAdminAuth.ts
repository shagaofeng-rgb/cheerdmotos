import crypto from 'node:crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

export const PRICING_ADMIN_COOKIE = 'cheerdmoto_pricing_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const pricingSalesUsers = [
  {account: 'cowin202601', password: process.env.PRICING_SALES_PASSWORD_202601 || 'hello123456', label: '业务员 01'},
  {account: 'cowin202602', password: process.env.PRICING_SALES_PASSWORD_202602 || 'hello123456', label: '业务员 02'}
];

function secret() {
  const value = process.env.PRICING_ADMIN_SESSION_SECRET || process.env.ADMIN_JWT_SECRET || process.env.SESSION_SECRET || '';
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('PRICING_ADMIN_SESSION_SECRET or ADMIN_JWT_SECRET is required in production.');
  }
  return 'cheerdmoto-local-pricing-admin-secret';
}

function base64Url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function verifyHash(password: string, storedHash: string) {
  const [scheme, iterationsValue, salt, digest] = storedHash.split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterationsValue || !salt || !digest) return false;
  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations) || iterations < 100000) return false;
  const expected = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  return digest.length === expected.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
}

export function pricingAccountLabel(account: string) {
  const user = pricingSalesUsers.find((item) => item.account === account);
  return user?.label || account;
}

export function verifyPricingAdminCredentials(email: string, password: string) {
  const adminEmail = (process.env.PRICING_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'support@cheerdmotos.com').trim().toLowerCase();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) return false;
  const salesUser = pricingSalesUsers.find((user) => user.account === normalizedEmail);
  if (salesUser) return password === salesUser.password;
  if (normalizedEmail !== adminEmail) return false;
  if (process.env.PRICING_ADMIN_PASSWORD_HASH) return verifyHash(password, process.env.PRICING_ADMIN_PASSWORD_HASH);
  if (process.env.PRICING_ADMIN_PASSWORD) return password === process.env.PRICING_ADMIN_PASSWORD;
  if (process.env.ADMIN_PASSWORD_HASH) return verifyHash(password, process.env.ADMIN_PASSWORD_HASH);
  if (process.env.ADMIN_PASSWORD) return password === process.env.ADMIN_PASSWORD;
  if (process.env.ADMIN_DEFAULT_PASSWORD) return password === process.env.ADMIN_DEFAULT_PASSWORD;
  return process.env.NODE_ENV !== 'production' && password === 'cheerdmoto-admin-demo';
}

export function createPricingAdminSession(email: string) {
  const payload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyPricingAdminSession(token?: string) {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, signature] = token.split('.');
  const expectedSignature = sign(encodedPayload);
  if (!signature || signature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {email?: string; exp?: number};
    if (!payload.email || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getPricingAdminSession() {
  const cookieStore = await cookies();
  return verifyPricingAdminSession(cookieStore.get(PRICING_ADMIN_COOKIE)?.value);
}

export async function requirePricingAdminSession() {
  const session = await getPricingAdminSession();
  if (!session) redirect('/pricing-admin/login');
  return session;
}

export async function requirePricingAdminApiSession() {
  const session = await getPricingAdminSession();
  if (!session) {
    return {session: null, response: Response.json({success: false, error: 'Pricing admin login required'}, {status: 401})};
  }
  return {session, response: null};
}

export function pricingAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  };
}

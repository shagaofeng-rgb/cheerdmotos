import crypto from 'node:crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

export const ADMIN_COOKIE_NAME = 'cheerdmoto_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
type StaffRole = 'support' | 'inventory' | 'read_only';
type AdminRole = 'admin' | StaffRole;
type AdminAccess = 'admin' | 'signed_in' | 'orders.read' | 'inquiries.retry';
const staffPages: Record<StaffRole, readonly string[]> = {
  support: ['dashboard', 'orders', 'leads', 'forms'],
  inventory: ['dashboard', 'inventory'],
  read_only: ['dashboard', 'inventory', 'sync']
};

function ownerEmail() {
  return (process.env.ADMIN_EMAIL || 'info@cheerdmotos.com').trim().toLowerCase();
}

function staffAccounts() {
  try {
    const accounts: unknown = JSON.parse(process.env.ADMIN_STAFF_ACCOUNTS || '[]');
    if (!Array.isArray(accounts)) return [];
    return accounts.filter((account): account is {email: string; passwordHash: string; role: StaffRole} => Boolean(
      account && typeof account.email === 'string' && typeof account.passwordHash === 'string' &&
      account.passwordHash.startsWith('pbkdf2_sha256$') && Object.hasOwn(staffPages, account.role)
    ));
  } catch {
    return [];
  }
}

export function adminRoleCounts() {
  const accounts = staffAccounts();
  return (Object.keys(staffPages) as StaffRole[]).map((role) => ({
    role, count: accounts.filter((account) => account.role === role).length
  }));
}

export function canAccessAdminPage(role: AdminRole, page: string) {
  return role === 'admin' || staffPages[role].includes(page);
}

function secret() {
  const value = process.env.ADMIN_JWT_SECRET || process.env.SESSION_SECRET || '';
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_JWT_SECRET or SESSION_SECRET is required in production.');
  }
  return 'cheerdmoto-local-admin-secret';
}

function base64Url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function verifyAdminCredentials(email: string, password: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) return false;
  if (normalizedEmail !== ownerEmail()) {
    const account = staffAccounts().find((item) => item.email.trim().toLowerCase() === normalizedEmail);
    return Boolean(account && verifyPasswordHash(password, account.passwordHash));
  }
  if (process.env.ADMIN_PASSWORD_HASH) return verifyPasswordHash(password, process.env.ADMIN_PASSWORD_HASH);
  if (process.env.ADMIN_PASSWORD) return password === process.env.ADMIN_PASSWORD;
  if (process.env.ADMIN_DEFAULT_PASSWORD) return password === process.env.ADMIN_DEFAULT_PASSWORD;
  return process.env.NODE_ENV !== 'production' && password === 'cheerdmoto-admin-demo';
}

export function hashAdminPassword(password: string, salt = crypto.randomBytes(16).toString('base64url')) {
  const iterations = 210000;
  const digest = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  return `pbkdf2_sha256$${iterations}$${salt}$${digest}`;
}

function verifyPasswordHash(password: string, storedHash: string) {
  const [scheme, iterationsValue, salt, digest] = storedHash.split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterationsValue || !salt || !digest) return false;
  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations) || iterations < 100000) return false;
  const expected = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  return digest.length === expected.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
}

export function createAdminSession(email: string) {
  const payload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminSession(token?: string) {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, signature] = token.split('.');
  const expectedSignature = sign(encodedPayload);
  if (!signature || signature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      email?: string;
      exp?: number;
    };
    if (!payload.email || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    const email = payload.email.trim().toLowerCase();
    const role: AdminRole | undefined = email === ownerEmail() ? 'admin' : staffAccounts().find((account) => account.email.trim().toLowerCase() === email)?.role;
    return role ? {email, exp: payload.exp, role} : null;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

export async function requireAdminPageSession(page: string) {
  const session = await requireAdminSession();
  if (!canAccessAdminPage(session.role, page)) redirect('/admin?access=denied');
  return session;
}

export async function requireAdminApiSession(access: AdminAccess = 'admin') {
  const session = await getAdminSession();
  if (!session) {
    return {session: null, response: Response.json({message: 'Admin login required'}, {status: 401})};
  }
  if (access !== 'signed_in' && session.role !== 'admin' &&
    !(session.role === 'support' && (access === 'orders.read' || access === 'inquiries.retry'))) {
    return {session: null, response: Response.json({message: '当前账号无权执行此操作'}, {status: 403})};
  }
  return {session, response: null};
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  };
}

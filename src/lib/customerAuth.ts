import crypto from 'node:crypto';
import {cookies} from 'next/headers';
import {readStoreOrders, updateStoreOrderPayment, type StoreOrder} from '@/lib/commerceStore';
import {appendStoreLine, readStoreLines, writeStoreLines} from '@/lib/durableStore';

const USERS_FILE = 'customer-users.jsonl';
const TOKENS_FILE = 'customer-tokens.jsonl';
export const CUSTOMER_COOKIE_NAME = 'cheerdmoto_customer_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type CustomerUser = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  country: string;
  passwordHash: string;
  status: 'pending_setup' | 'active';
  emailVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
};

type CustomerToken = {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  type: 'password_setup' | 'password_reset';
  expiresAt: string;
  usedAt: string;
  createdAt: string;
};

function authSecret() {
  const value = process.env.AUTH_SECRET || process.env.JWT_SECRET || process.env.SESSION_SECRET || process.env.ADMIN_JWT_SECRET || '';
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET, JWT_SECRET, SESSION_SECRET or ADMIN_JWT_SECRET is required in production.');
  }
  return 'cheerdmoto-local-customer-secret';
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function sign(value: string) {
  return crypto.createHmac('sha256', authSecret()).update(value).digest('base64url');
}

function base64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

export function hashCustomerPassword(password: string, salt = crypto.randomBytes(16).toString('base64url')) {
  const iterations = 210000;
  const digest = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  return `pbkdf2_sha256$${iterations}$${salt}$${digest}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [scheme, iterationsValue, salt, digest] = storedHash.split('$');
  if (scheme !== 'pbkdf2_sha256' || !iterationsValue || !salt || !digest) return false;
  const expected = crypto.pbkdf2Sync(password, salt, Number(iterationsValue), 32, 'sha256').toString('base64url');
  return expected.length === digest.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
}

export async function readCustomerUsers() {
  return (await readStoreLines<CustomerUser>(USERS_FILE)).map((user) => ({
    ...user,
    firstName: user.firstName || user.name.split(/\s+/)[0] || '',
    lastName: user.lastName || user.name.split(/\s+/).slice(1).join(' ') || '',
    country: user.country || '',
    emailVerifiedAt: user.emailVerifiedAt || (user.status === 'active' ? user.createdAt : '')
  }));
}

export async function findCustomerUserByEmail(email: string) {
  const normalized = String(email || '').trim().toLowerCase();
  return (await readCustomerUsers()).find((user) => user.email === normalized) || null;
}

export async function findCustomerUserById(userId: string) {
  return (await readCustomerUsers()).find((user) => user.id === userId) || null;
}

export async function createOrUpdateCustomerUser(input: {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  password?: string;
  activate?: boolean;
}) {
  const normalized = input.email.trim().toLowerCase();
  const users = await readCustomerUsers();
  const now = new Date().toISOString();
  let user = users.find((item) => item.email === normalized) || null;
  if (user) {
    user = {
      ...user,
      name: input.name || user.name,
      firstName: input.firstName ?? user.firstName ?? '',
      lastName: input.lastName ?? user.lastName ?? '',
      country: input.country ?? user.country ?? '',
      passwordHash: input.password ? hashCustomerPassword(input.password) : user.passwordHash,
      status: input.activate || input.password ? 'active' : user.status,
      emailVerifiedAt: input.activate || input.password ? (user.emailVerifiedAt || now) : user.emailVerifiedAt,
      updatedAt: now
    };
    await writeStoreLines(USERS_FILE, users.map((item) => item.id === user?.id ? user : item));
    return user;
  }
  user = {
    id: `cus-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    email: normalized,
    name: input.name,
    firstName: input.firstName || input.name.split(/\s+/)[0] || '',
    lastName: input.lastName || input.name.split(/\s+/).slice(1).join(' ') || '',
    country: input.country || '',
    passwordHash: input.password ? hashCustomerPassword(input.password) : '',
    status: input.activate || input.password ? 'active' : 'pending_setup',
    emailVerifiedAt: input.activate || input.password ? now : '',
    createdAt: now,
    updatedAt: now
  };
  await appendStoreLine(USERS_FILE, user);
  return user;
}

export async function bindOrdersToCustomer(email: string, userId: string) {
  const orders = await readStoreOrders();
  const normalized = email.trim().toLowerCase();
  const matching = orders.filter((order) => order.customer.email.trim().toLowerCase() === normalized && order.userId !== userId);
  for (const order of matching) {
    await updateStoreOrderPayment(order.id, {userId});
  }
  return matching.length;
}

export function customerOwnsOrder(order: StoreOrder, session: {userId?: string; email?: string}) {
  const sessionEmail = String(session.email || '').trim().toLowerCase();
  const orderEmail = String(order.customer.email || '').trim().toLowerCase();
  return Boolean((session.userId && order.userId === session.userId) || (sessionEmail && orderEmail === sessionEmail));
}

export async function updateCustomerProfile(userId: string, patch: {name?: string; firstName?: string; lastName?: string; country?: string}): Promise<CustomerUser | null> {
  const users = await readCustomerUsers();
  const now = new Date().toISOString();
  let updated: CustomerUser | null = null;
  const next: CustomerUser[] = users.map((user) => {
    if (user.id !== userId) return user;
    const firstName = patch.firstName ?? user.firstName;
    const lastName = patch.lastName ?? user.lastName;
    const nextUser: CustomerUser = {
      ...user,
      name: patch.name || `${firstName} ${lastName}`.trim() || user.name,
      firstName,
      lastName,
      country: patch.country ?? user.country,
      updatedAt: now
    };
    updated = nextUser;
    return nextUser;
  });
  if (!updated) return null;
  await writeStoreLines(USERS_FILE, next);
  return updated;
}

export async function ensureCustomerAccountForOrder(order: StoreOrder) {
  const name = order.customer.name || `${order.checkout.firstName} ${order.checkout.lastName}`.trim() || order.customer.email;
  const user = await createOrUpdateCustomerUser({email: order.customer.email, name});
  await bindOrdersToCustomer(order.customer.email, user.id);
  return user;
}

export async function createCustomerToken(user: CustomerUser, type: CustomerToken['type']) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const record: CustomerToken = {
    id: `token-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userId: user.id,
    email: user.email,
    tokenHash: sha256(rawToken),
    type,
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
    usedAt: '',
    createdAt: now.toISOString()
  };
  await appendStoreLine(TOKENS_FILE, record);
  return rawToken;
}

export async function consumeCustomerToken(rawToken: string, password: string) {
  const tokenHash = sha256(rawToken);
  const tokens = await readStoreLines<CustomerToken>(TOKENS_FILE);
  const now = new Date().toISOString();
  const token = tokens.find((item) => item.tokenHash === tokenHash && !item.usedAt && item.expiresAt > now);
  if (!token) return null;
  const users = await readCustomerUsers();
  const user = users.find((item) => item.id === token.userId);
  if (!user) return null;
  const updatedUser = {...user, passwordHash: hashCustomerPassword(password), status: 'active' as const, updatedAt: now};
  await writeStoreLines(USERS_FILE, users.map((item) => item.id === user.id ? updatedUser : item));
  await writeStoreLines(TOKENS_FILE, tokens.map((item) => item.id === token.id ? {...item, usedAt: now} : item));
  await bindOrdersToCustomer(updatedUser.email, updatedUser.id);
  return updatedUser;
}

export async function verifyCustomerCredentials(email: string, password: string) {
  const user = await findCustomerUserByEmail(email);
  if (!user || user.status !== 'active' || !user.passwordHash) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

export function createCustomerSession(user: CustomerUser) {
  const payload = {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const encoded = base64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyCustomerSession(token?: string) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (!signature || signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {userId?: string; email?: string; exp?: number};
    if (!decoded.userId || !decoded.email || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  return verifyCustomerSession(cookieStore.get(CUSTOMER_COOKIE_NAME)?.value);
}

export function customerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS
  };
}

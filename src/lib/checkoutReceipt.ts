import {createHmac, timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {findStoreOrder} from '@/lib/commerceStore';
import {customerAuthSecret, customerOwnsOrder, getCustomerSession} from '@/lib/customerAuth';

const RECEIPT_MAX_AGE = 24 * 60 * 60;
const validOrderNumber = /^CM\d{20}$/;

function receiptName(orderId: string) {
  return `cowin_receipt_${orderId}`;
}

function signature(orderId: string, expiry: string) {
  return createHmac('sha256', customerAuthSecret()).update(`checkout-receipt:${orderId}:${expiry}`).digest('base64url');
}

export async function issueCheckoutReceipt(orderId: string) {
  if (!validOrderNumber.test(orderId)) return;
  const expiry = String(Math.floor(Date.now() / 1000) + RECEIPT_MAX_AGE);
  (await cookies()).set(receiptName(orderId), `${expiry}.${signature(orderId, expiry)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: RECEIPT_MAX_AGE
  });
}

export async function getCheckoutOrder(orderId: unknown) {
  if (typeof orderId !== 'string' || !validOrderNumber.test(orderId)) return null;
  const token = (await cookies()).get(receiptName(orderId))?.value || '';
  const [expiry, signed] = token.split('.');
  if (signed && /^\d{10,}$/.test(expiry) && Number(expiry) > Math.floor(Date.now() / 1000)) {
    const expected = Buffer.from(signature(orderId, expiry));
    const actual = Buffer.from(signed);
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) return findStoreOrder(orderId);
  }
  const session = await getCustomerSession();
  if (!session) return null;
  const order = await findStoreOrder(orderId);
  return order && customerOwnsOrder(order, session) ? order : null;
}

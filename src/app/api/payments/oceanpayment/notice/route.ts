import {createHash} from 'node:crypto';
import {after} from 'next/server';
import {appendAnalyticsEvent, appendPaymentNotification, findStoreOrder, readPaymentNotifications, updateStoreOrderPayment} from '@/lib/commerceStore';
import {createCustomerToken, ensureCustomerAccountForOrder} from '@/lib/customerAuth';
import {persistentWritesAvailable, withStoreLock} from '@/lib/durableStore';
import {sendAccountActivationEmail, sendAdminPaymentNotice, sendOrderSuccessEmailOnce} from '@/lib/emailService';
import {oceanpaymentStatusToOrder, parseGatewayPayload, sanitizeOceanpaymentFields, validateOceanpaymentNotification, verifyOceanpaymentReturn} from '@/lib/oceanpayment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!persistentWritesAvailable()) return new Response('storage-unavailable', {status: 503});
    const fields = await parseGatewayPayload(request);
    const orderId = fields.order_number || '';
    if (!/^CM\d{20}$/.test(orderId) || !verifyOceanpaymentReturn(fields)) return new Response('verify-fail', {status: 400});
    const paymentId = fields.payment_id || '';
    const paymentStatus = fields.payment_status || '';
    const eventKey = createHash('sha256').update(JSON.stringify([orderId, paymentId, paymentStatus])).digest('hex');

    return await withStoreLock(`payment-notice-${orderId}`, async () => {
      const previous = await findStoreOrder(orderId);
      if (!previous) return new Response('order-not-found', {status: 404});
      const validation = validateOceanpaymentNotification(previous, fields);
      if (!validation.ok) {
        console.error('[oceanpayment] callback data mismatch', {orderId, errors: validation.errors});
        return new Response('callback-mismatch', {status: 400});
      }
      if ((await readPaymentNotifications()).some((event) => event.eventKey === eventKey)) return new Response('receive-ok');
      const patch = oceanpaymentStatusToOrder(fields);
      if (patch.status === 'paid' && !paymentId) return new Response('missing-payment-reference', {status: 400});
      if (previous.gatewayStatus === 'success' && patch.status !== 'paid') return new Response('receive-ok');
      if (previous.gatewayStatus === 'success' && previous.paymentId && previous.paymentId !== paymentId) {
        console.error('[oceanpayment] second payment reference on a paid order', {orderId});
        return new Response('duplicate-payment-id', {status: 409});
      }
      const latePayment = patch.status === 'paid' && Boolean(previous.inventory && Date.parse(previous.inventory.reservedUntil) <= Date.now());
      const order = await updateStoreOrderPayment(orderId, {
        ...patch,
        ...(paymentId ? {paymentId, transactionId: paymentId} : {}),
        ...(latePayment ? {logisticsStatus: 'Payment arrived after the inventory reservation expired. Verify stock before shipment.'} : {})
      });
      if (!order) return new Response('order-not-found', {status: 404});
      await appendPaymentNotification({
        orderId, provider: 'oceanpayment', verified: true, paymentStatus, paymentId, eventKey,
        raw: sanitizeOceanpaymentFields(fields)
      });
      after(async () => {
        const tasks = [
          appendAnalyticsEvent({
            id: eventKey, type: 'payment_notice', visitorId: 'payment-gateway', sessionId: orderId,
            page: '/api/payments/oceanpayment/notice', pageTitle: 'Oceanpayment Notice', referrer: 'Oceanpayment',
            country: order.customer.country, city: '', device: 'Gateway', browser: 'Gateway', os: 'Gateway',
            timestamp: new Date().toISOString(), payload: {orderId, verified: true, paymentStatus}
          }),
          sendAdminPaymentNotice(order, {
            source: 'oceanpayment_notice', verified: true, paymentStatus, paymentId,
            detail: latePayment ? order.logisticsStatus : 'Oceanpayment confirmed this order status.'
          })
        ];
        if (patch.status === 'paid' && order.gatewayStatus === 'success') {
          tasks.push(sendOrderSuccessEmailOnce(order));
          tasks.push((async () => {
            const user = await ensureCustomerAccountForOrder(order);
            if (user.ownershipConfirmedAt) return;
            const token = await createCustomerToken(user, 'password_setup');
            const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
            await sendAccountActivationEmail(order, `${baseUrl}/account/reset-password?token=${encodeURIComponent(token)}`);
          })());
        }
        const results = await Promise.allSettled(tasks);
        if (results.some((result) => result.status === 'rejected')) console.error('[oceanpayment] follow-up failed', orderId);
      });
      return new Response('receive-ok');
    }, {ttlSeconds: 60, attempts: 10});
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_PAYMENT_ID') return new Response('duplicate-payment-id', {status: 409});
    console.error('[oceanpayment] notice failed', error);
    return new Response('receive-fail', {status: 500});
  }
}

import {appendAnalyticsEvent, appendPaymentNotification, findStoreOrder, readStoreOrders, updateStoreOrderPayment} from '@/lib/commerceStore';
import {createCustomerToken, ensureCustomerAccountForOrder} from '@/lib/customerAuth';
import {sendAccountActivationEmail, sendAdminPaymentNotice, sendOrderSuccessEmailOnce} from '@/lib/emailService';
import {
  oceanpaymentStatusToOrder,
  parseGatewayPayload,
  sanitizeOceanpaymentFields,
  validateOceanpaymentNotification,
  verifyOceanpaymentReturn
} from '@/lib/oceanpayment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const fields = await parseGatewayPayload(request);
    const orderId = fields.order_number || fields.orderNo || fields.order_id || '';
    const verified = verifyOceanpaymentReturn(fields);
    if (!orderId || !verified) {
      console.error('[oceanpayment-notice] invalid callback', {orderId, verified, keys: Object.keys(fields)});
      return new Response('verify-fail', {status: 400});
    }
    const previousOrder = await findStoreOrder(orderId);
    if (!previousOrder) {
      console.error('[oceanpayment-notice] unknown order', {orderId});
      return new Response('order-not-found', {status: 404});
    }
    const validation = validateOceanpaymentNotification(previousOrder, fields);
    if (!validation.ok) {
      console.error('[oceanpayment-notice] callback data mismatch', {orderId, errors: validation.errors});
      await appendPaymentNotification({
        orderId,
        provider: 'oceanpayment',
        verified: false,
        paymentStatus: fields.payment_status || fields.status || '',
        paymentId: fields.payment_id || fields.transaction_id || fields.trade_no || '',
        raw: sanitizeOceanpaymentFields(fields)
      });
      await sendAdminPaymentNotice(previousOrder, {
        source: 'oceanpayment_notice',
        verified: false,
        paymentStatus: fields.payment_status || fields.status || 'callback_mismatch',
        paymentId: fields.payment_id || fields.transaction_id || fields.trade_no || '',
        detail: `Callback data mismatch: ${validation.errors.join('; ')}`
      });
      return new Response('callback-mismatch', {status: 400});
    }
    const paymentId = fields.payment_id || fields.transaction_id || fields.trade_no || '';
    if (paymentId) {
      const duplicatePaymentOrder = (await readStoreOrders()).find((order) => {
        if (order.id === orderId) return false;
        return order.paymentId === paymentId || order.transactionId === paymentId;
      });
      if (duplicatePaymentOrder) {
        console.error('[oceanpayment-notice] duplicate payment id binding blocked', {orderId, paymentId, existingOrderId: duplicatePaymentOrder.id});
        return new Response('duplicate-payment-id', {status: 409});
      }
    }

    await appendPaymentNotification({
      orderId,
      provider: 'oceanpayment',
      verified,
      paymentStatus: fields.payment_status || fields.status || '',
      paymentId,
      raw: sanitizeOceanpaymentFields(fields)
    });
    const paymentPatch = oceanpaymentStatusToOrder(fields);
    const order = await updateStoreOrderPayment(orderId, {
      paymentGateway: 'oceanpayment',
      paymentId,
      transactionId: paymentId,
      ...paymentPatch
    });
    if (order) {
      await sendAdminPaymentNotice(order, {
        source: 'oceanpayment_notice',
        verified,
        paymentStatus: fields.payment_status || fields.status || paymentPatch.status,
        paymentId,
        detail: paymentPatch.status === 'paid' ? 'Payment confirmed by Oceanpayment async notice.' : 'Payment notice received and order status updated.'
      });
    }
    if (order && paymentPatch.status === 'paid' && previousOrder?.status !== 'paid') {
      const user = await ensureCustomerAccountForOrder(order);
      const token = await createCustomerToken(user, user.status === 'active' ? 'password_reset' : 'password_setup');
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cheerdmotos.com').replace(/\/$/, '');
      await Promise.all([
        sendOrderSuccessEmailOnce(order),
        sendAccountActivationEmail(order, `${baseUrl}/account/reset-password?token=${encodeURIComponent(token)}`)
      ]);
    }
    await appendAnalyticsEvent({
      id: `${Date.now()}-oceanpayment-notice`,
      type: 'payment_notice',
      visitorId: 'payment-gateway',
      sessionId: orderId,
      page: '/api/payments/oceanpayment/notice',
      pageTitle: 'Oceanpayment Notice',
      referrer: 'Oceanpayment',
      country: order?.customer.country || '',
      city: '',
      device: 'Gateway',
      browser: 'Gateway',
      os: 'Gateway',
      timestamp: new Date().toISOString(),
      payload: {orderId, verified, paymentStatus: fields.payment_status, paymentId}
    });

    return new Response('receive-ok', {status: 200});
  } catch (error) {
    console.error('Oceanpayment notice failed', error);
    return new Response('receive-fail', {status: 500});
  }
}

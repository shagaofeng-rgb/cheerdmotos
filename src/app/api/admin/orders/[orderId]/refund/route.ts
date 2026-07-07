import {requireAdminApiSession} from '@/lib/adminAuth';
import {appendAnalyticsEvent, appendRefundRecord, findStoreOrder, updateStoreOrderPayment} from '@/lib/commerceStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value: unknown, limit = 240) {
  return String(value || '').trim().slice(0, limit);
}

async function readPayload(request: Request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json().catch(() => ({}));
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

export async function POST(request: Request, {params}: {params: Promise<{orderId: string}>}) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const {orderId} = await params;
  const order = await findStoreOrder(orderId);
  if (!order) return Response.json({message: 'Order not found'}, {status: 404});
  if (!['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status)) {
    return Response.json({message: 'Only paid orders can be refunded'}, {status: 400});
  }

  const payload = await readPayload(request);
  const amount = Math.max(0, Math.min(order.total, Number(payload.amount || order.total)));
  const reason = clean(payload.reason || 'Merchant refund request', 500);
  if (!amount) return Response.json({message: 'Refund amount is required'}, {status: 400});

  const endpoint = process.env.OCEANPAYMENT_REFUND_API_URL || '';
  const requestPayload = {
    orderId: order.id,
    paymentId: order.paymentId || order.transactionId,
    amount,
    currency: order.currency,
    reason
  };
  const refund = await appendRefundRecord({
    orderId,
    paymentId: order.paymentId || order.transactionId,
    oceanpaymentRefundId: '',
    amount,
    currency: order.currency,
    status: endpoint ? 'pending' : 'failed',
    reason,
    requestPayload,
    responsePayload: endpoint
      ? {message: 'Refund endpoint configured. Submit adapter requires Oceanpayment refund API field confirmation.'}
      : {message: 'OCEANPAYMENT_REFUND_API_URL is not configured yet.'}
  });

  const fullRefund = amount >= order.total;
  const updated = await updateStoreOrderPayment(orderId, {
    refundStatus: refund.status,
    status: fullRefund ? 'refunded' : 'partial_refunded',
    gatewayStatus: fullRefund ? 'refunded' : 'partial_refunded',
    logisticsStatus: fullRefund ? 'Refund record created for full amount.' : 'Partial refund record created.'
  });

  await appendAnalyticsEvent({
    id: `${Date.now()}-admin-refund-create`,
    type: 'refund_created',
    visitorId: 'admin',
    sessionId: orderId,
    page: `/admin/orders/${orderId}`,
    pageTitle: 'Admin refund request',
    referrer: '',
    country: order.customer.country,
    city: '',
    device: 'Admin',
    browser: 'Admin',
    os: 'Admin',
    timestamp: new Date().toISOString(),
    payload: {orderId, amount, refundNo: refund.refundNo}
  });

  return Response.json({ok: true, order: updated, refund});
}

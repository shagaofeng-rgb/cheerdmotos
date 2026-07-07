import {requireAdminApiSession} from '@/lib/adminAuth';
import {appendAnalyticsEvent, appendAuthorizationRecord, findStoreOrder, updateStoreOrderPayment} from '@/lib/commerceStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const payload = await readPayload(request);
  const action = String(payload.action || 'create').trim();
  const amount = Math.max(0, Math.min(order.total, Number(payload.amount || order.total)));
  const endpoint = process.env.OCEANPAYMENT_AUTHORIZATION_API_URL || '';
  const status = endpoint ? (action === 'capture' ? 'captured' : action === 'cancel' ? 'cancelled' : 'created') : 'disabled';
  const record = await appendAuthorizationRecord({
    orderId,
    amount,
    currency: order.currency,
    status,
    capturedAmount: status === 'captured' ? amount : 0,
    requestPayload: {orderId, action, amount, currency: order.currency},
    responsePayload: endpoint
      ? {message: 'Authorization endpoint configured. Submit adapter requires Oceanpayment authorization API field confirmation.'}
      : {message: 'OCEANPAYMENT_AUTHORIZATION_API_URL is not configured yet.'}
  });

  const updated = await updateStoreOrderPayment(orderId, {
    logisticsStatus: `Authorization ${record.authorizationNo} ${status}.`
  });

  await appendAnalyticsEvent({
    id: `${Date.now()}-admin-authorization`,
    type: 'authorization_action',
    visitorId: 'admin',
    sessionId: orderId,
    page: `/admin/orders/${orderId}`,
    pageTitle: 'Admin authorization action',
    referrer: '',
    country: order.customer.country,
    city: '',
    device: 'Admin',
    browser: 'Admin',
    os: 'Admin',
    timestamp: new Date().toISOString(),
    payload: {orderId, action, amount, authorizationNo: record.authorizationNo, status}
  });

  return Response.json({ok: true, order: updated, authorization: record});
}

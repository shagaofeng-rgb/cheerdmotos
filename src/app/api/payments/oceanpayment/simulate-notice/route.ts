import {appendAnalyticsEvent, updateStoreOrderPayment} from '@/lib/commerceStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (process.env.OCEANPAYMENT_ALLOW_NOTICE_SIMULATION !== 'true') {
    return Response.json({message: 'Simulation endpoint is disabled'}, {status: 403});
  }
  const auth = request.headers.get('x-simulation-token') || '';
  if (process.env.OCEANPAYMENT_SIMULATION_TOKEN && auth !== process.env.OCEANPAYMENT_SIMULATION_TOKEN) {
    return Response.json({message: 'Invalid simulation token'}, {status: 401});
  }
  const payload = await request.json();
  const orderId = String(payload.orderId || '').trim();
  if (!orderId) return Response.json({message: 'orderId is required'}, {status: 400});

  const paid = payload.status !== 'failed';
  const order = await updateStoreOrderPayment(orderId, {
    paymentGateway: 'oceanpayment',
    gatewayStatus: paid ? 'success' : 'failed',
    status: paid ? 'paid' : 'pending_payment',
    logisticsStatus: paid ? 'Simulated Oceanpayment payment confirmed.' : 'Simulated Oceanpayment payment failed.'
  });
  if (!order) return Response.json({message: 'Order not found'}, {status: 404});

  await appendAnalyticsEvent({
    id: `${Date.now()}-oceanpayment-simulate`,
    type: 'payment_notice_simulated',
    visitorId: 'local-test',
    sessionId: orderId,
    page: '/api/payments/oceanpayment/simulate-notice',
    pageTitle: 'Oceanpayment Notice Simulation',
    referrer: '',
    country: order.customer.country,
    city: '',
    device: 'Test',
    browser: 'Test',
    os: 'Test',
    timestamp: new Date().toISOString(),
    payload: {orderId, paid}
  });

  return Response.json({ok: true, order});
}

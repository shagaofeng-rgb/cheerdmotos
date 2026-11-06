import {findStoreOrder, updateStoreOrderPayment} from '@/lib/commerceStore';
import {getCheckoutOrder, issueCheckoutReceipt} from '@/lib/checkoutReceipt';
import {persistentWritesAvailable} from '@/lib/durableStore';
import {oceanpaymentStatusToOrder, parseGatewayPayload, validateOceanpaymentNotification, verifyOceanpaymentReturn} from '@/lib/oceanpayment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleBack(request: Request) {
  const url = new URL(request.url);
  const fields = request.method === 'GET' ? Object.fromEntries(url.searchParams.entries()) : await parseGatewayPayload(request).catch(() => ({} as Record<string, string>));
  const orderId = fields.order_number || fields.orderNo || fields.order_id || '';
  const candidate = persistentWritesAvailable() && verifyOceanpaymentReturn(fields) ? await findStoreOrder(orderId) : null;
  const verified = candidate && validateOceanpaymentNotification(candidate, fields).ok;
  const order = verified ? candidate : await getCheckoutOrder(orderId);
  if (verified) {
    await issueCheckoutReceipt(orderId);
    if (oceanpaymentStatusToOrder(fields).status === 'paid') {
      await updateStoreOrderPayment(orderId, {
        status: 'processing',
        gatewayStatus: 'processing',
        logisticsStatus: 'Payment return verified. Waiting for Oceanpayment confirmation.'
      }, {browserReturn: true});
    }
  }
  const result = verified && oceanpaymentStatusToOrder(fields).status !== 'failed' || order?.gatewayStatus === 'success' ? 'success' : 'failed';
  const destination = new URL(`/checkout/${result}`, request.url);
  if (order) destination.searchParams.set('order', order.id);
  return new Response(null, {status: 303, headers: {
    Location: destination.toString(), 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer'
  }});
}

export const GET = handleBack;
export const POST = handleBack;

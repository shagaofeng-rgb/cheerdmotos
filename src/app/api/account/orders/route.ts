import {readStoreOrders} from '@/lib/commerceStore';
import {customerOwnsOrder, getCustomerSession} from '@/lib/customerAuth';
import {products} from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serializeOrder(order: Awaited<ReturnType<typeof readStoreOrders>>[number]) {
  return {
    id: order.id,
    orderNo: order.id,
    createdAt: order.createdAt,
    productSlug: order.productSlug,
    productName: order.productName,
    productImage: products[order.productSlug]?.image || '',
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    subtotal: order.subtotal,
    shippingEstimate: order.shippingEstimate,
    total: order.total,
    currency: order.currency,
    orderStatus: order.status,
    paymentStatus: order.gatewayStatus,
    paymentMethod: order.paymentMethod,
    paymentId: order.paymentId || order.transactionId,
    shipmentStatus: order.shipmentStatus,
    logisticsProvider: order.logisticsProvider,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    shippedAt: order.shippedAt,
    estimatedDeliveryAt: order.estimatedDeliveryAt,
    deliveredAt: order.deliveredAt,
    customerVisibleNote: order.customerVisibleNote
  };
}

export async function GET(request: Request) {
  const session = await getCustomerSession();
  if (!session) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const allOrders = (await readStoreOrders())
    .filter((order) => customerOwnsOrder(order, session))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const start = (page - 1) * pageSize;
  return Response.json(
    {ok: true, page, pageSize, total: allOrders.length, orders: allOrders.slice(start, start + pageSize).map(serializeOrder)},
    {headers: {'Cache-Control': 'private, no-store'}}
  );
}

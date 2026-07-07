import {findStoreOrder} from '@/lib/commerceStore';
import {customerOwnsOrder, getCustomerSession} from '@/lib/customerAuth';
import {products} from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, {params}: {params: Promise<{orderNo: string}>}) {
  const session = await getCustomerSession();
  if (!session) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  const {orderNo} = await params;
  const order = await findStoreOrder(orderNo);
  if (!order || !customerOwnsOrder(order, session)) {
    return Response.json({message: 'Order not found'}, {status: 404, headers: {'Cache-Control': 'private, no-store'}});
  }
  return Response.json(
    {
      ok: true,
      order: {
        ...order,
        productImage: products[order.productSlug]?.image || '',
        paymentStatus: order.gatewayStatus,
        orderStatus: order.status,
        paymentAmount: order.total,
        paymentCurrency: order.currency,
        paymentReference: order.paymentId || order.transactionId,
        trackingUrl: order.trackingUrl,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        customerVisibleNote: order.customerVisibleNote
      }
    },
    {headers: {'Cache-Control': 'private, no-store'}}
  );
}

import {getCheckoutOrder} from '@/lib/checkoutReceipt';

const headers = {'Cache-Control': 'private, no-store'};

export async function GET(request: Request) {
  const order = await getCheckoutOrder(new URL(request.url).searchParams.get('order'));
  if (!order) return Response.json({message: 'Order not found'}, {status: 404, headers});
  return Response.json({order: {id: order.id, orderStatus: order.status, paymentStatus: order.gatewayStatus}}, {headers});
}

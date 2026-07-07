import {requireAdminApiSession} from '@/lib/adminAuth';
import {appendAnalyticsEvent, findStoreOrder, updateStoreOrderPayment, upsertShipmentRecord, type ShipmentStatus} from '@/lib/commerceStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value: unknown, limit = 240) {
  return String(value || '').trim().slice(0, limit);
}

export async function POST(request: Request, {params}: {params: Promise<{orderId: string}>}) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const {orderId} = await params;
  const order = await findStoreOrder(orderId);
  if (!order) return Response.json({message: 'Order not found'}, {status: 404});

  const formData = await request.formData();
  const shipmentStatus = (clean(formData.get('shipmentStatus'), 40) || 'shipped') as ShipmentStatus;
  const logisticsProvider = clean(formData.get('logisticsProvider'), 120);
  const trackingNumber = clean(formData.get('trackingNumber'), 120);
  const trackingUrl = clean(formData.get('trackingUrl'), 260);
  const shippedAt = clean(formData.get('shippedAt'), 80) || new Date().toISOString();
  const estimatedDeliveryAt = clean(formData.get('estimatedDeliveryAt'), 80);
  const deliveredAt = clean(formData.get('deliveredAt'), 80);
  const customerVisibleNote = clean(formData.get('customerVisibleNote') || formData.get('note'), 500);
  const internalNote = clean(formData.get('internalNote'), 500);
  if (!logisticsProvider || !trackingNumber) {
    return Response.json({message: 'Logistics provider and tracking number are required'}, {status: 400});
  }

  const uploadEndpoint = process.env.OCEANPAYMENT_LOGISTICS_API_URL || '';
  const shipment = await upsertShipmentRecord({
    orderId,
    logisticsProvider,
    trackingNumber,
    trackingUrl,
    shipmentStatus,
    shippedAt,
    estimatedDeliveryAt,
    deliveredAt,
    customerVisibleNote,
    internalNote,
    uploadStatus: uploadEndpoint ? 'pending' : 'not_required',
    uploadResponse: uploadEndpoint ? {message: 'Oceanpayment logistics endpoint configured; upload adapter pending merchant docs.'} : {message: 'No Oceanpayment logistics endpoint configured'}
  });

  const updated = await updateStoreOrderPayment(orderId, {
    trackingNumber,
    trackingUrl,
    logisticsProvider,
    shipmentStatus,
    shippedAt,
    estimatedDeliveryAt,
    deliveredAt,
    customerVisibleNote,
    status: shipmentStatus === 'delivered' ? 'delivered' : 'shipped',
    logisticsStatus: `${logisticsProvider} ${trackingNumber} (${shipmentStatus})`
  });

  await appendAnalyticsEvent({
    id: `${Date.now()}-admin-shipment-save`,
    type: 'shipment_saved',
    visitorId: 'admin',
    sessionId: orderId,
    page: `/admin/orders/${orderId}`,
    pageTitle: 'Admin shipment update',
    referrer: '',
    country: order.customer.country,
    city: '',
    device: 'Admin',
    browser: 'Admin',
    os: 'Admin',
    timestamp: new Date().toISOString(),
    payload: {orderId, trackingNumber, shipmentStatus}
  });

  return Response.json({ok: true, order: updated, shipment});
}

export async function GET(_request: Request, {params}: {params: Promise<{orderId: string}>}) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;
  const {orderId} = await params;
  const order = await findStoreOrder(orderId);
  if (!order) return Response.json({message: 'Order not found'}, {status: 404});
  return Response.json({
    ok: true,
    shipment: {
      orderId,
      logisticsProvider: order.logisticsProvider,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      shipmentStatus: order.shipmentStatus,
      shippedAt: order.shippedAt,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      deliveredAt: order.deliveredAt,
      customerVisibleNote: order.customerVisibleNote
    }
  });
}

export async function PATCH(request: Request, context: {params: Promise<{orderId: string}>}) {
  return POST(request, context);
}

import {appendAnalyticsEvent, findStoreOrder, updateStoreOrderPayment} from '@/lib/commerceStore';
import {buildOceanpaymentPayload, oceanpaymentToStoreMethod, paymentMethodToOceanpayment, type OceanpaymentScene} from '@/lib/oceanpayment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  ).slice(0, 80);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const orderId = String(payload.orderId || '').trim();
    const order = await findStoreOrder(orderId);
    if (!order) {
      return Response.json({message: 'Order not found'}, {status: 404});
    }
    if (
      order.gatewayStatus === 'success' ||
      order.gatewayStatus === 'refunded' ||
      ['paid', 'processing', 'shipped', 'delivered', 'completed', 'refunded'].includes(order.status)
    ) {
      return Response.json({message: 'This order has already been paid'}, {status: 409});
    }

    const method = paymentMethodToOceanpayment(payload.paymentMethod || order.paymentMethod);
    const scene: OceanpaymentScene = payload.scene === 'non-3d' ? 'non-3d' : '3d';
    const checkoutUrl = typeof payload.checkoutUrl === 'string' ? payload.checkoutUrl : undefined;
    const forceTestMode =
      order.productSlug === 'payment-test' ||
      Boolean(checkoutUrl && /[?&](gateway|opEnv|sandbox)=?(test|sandbox|1)?(?:&|$)/i.test(checkoutUrl));
    const oceanpayment = buildOceanpaymentPayload({
      order,
      method,
      scene,
      locale: String(payload.locale || 'en'),
      checkoutUrl,
      forceTestMode,
      billingIp:
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        undefined
    });

    const updated = await updateStoreOrderPayment(order.id, {
      paymentMethod: oceanpaymentToStoreMethod(method),
      paymentGateway: 'oceanpayment',
      gatewayStatus: oceanpayment.configured ? 'pending' : 'not_submitted',
      logisticsStatus: oceanpayment.configured
        ? 'Oceanpayment request generated. Waiting for buyer payment result.'
        : 'Oceanpayment credentials are not configured yet.'
    });

    await appendAnalyticsEvent({
      id: `${Date.now()}-oceanpayment-create`,
      type: 'payment_request_create',
      visitorId: 'checkout',
      sessionId: order.id,
      page: '/checkout',
      pageTitle: 'Oceanpayment Embedded Checkout',
      referrer: '',
      country: order.customer.country,
      city: '',
      device: 'Unknown',
      browser: 'Unknown',
      os: 'Unknown',
      ip: clientIp(request),
      timestamp: new Date().toISOString(),
      attribution: order.attribution || null,
      payload: {
        orderId: order.id,
        method,
        scene,
        configured: oceanpayment.configured,
        billingCountry: oceanpayment.billing.billingCountry,
        billingState: oceanpayment.billing.billingState,
        billingWarnings: oceanpayment.billing.warnings
      }
    });

    return Response.json({
      ok: true,
      status: oceanpayment.configured ? 'ready_to_submit' : 'waiting_for_credentials',
      order: updated || order,
      oceanpayment: {
        configured: oceanpayment.configured,
        testMode: oceanpayment.testMode,
        gatewayUrl: oceanpayment.gatewayUrl,
        fields: oceanpayment.fields,
        billing: oceanpayment.billing
      }
    });
  } catch (error) {
    console.error('Oceanpayment create failed', error);
    if (error instanceof Error && /billing address|billing_state|state\/province/i.test(error.message)) {
      return Response.json({message: error.message}, {status: 422});
    }
    return Response.json({message: 'Oceanpayment request failed'}, {status: 500});
  }
}

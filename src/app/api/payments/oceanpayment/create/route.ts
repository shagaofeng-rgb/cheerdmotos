import {appendAnalyticsEvent, updateStoreOrderPayment} from '@/lib/commerceStore';
import {getCheckoutOrder} from '@/lib/checkoutReceipt';
import {persistentWritesAvailable} from '@/lib/durableStore';
import {buildOceanpaymentPayload, oceanpaymentToStoreMethod, onlinePaymentAvailable, paymentMethodToOceanpayment, type OceanpaymentScene} from '@/lib/oceanpayment';

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
    if (!persistentWritesAvailable()) return Response.json({message: 'Payment is temporarily unavailable.'}, {status: 503});
    const payload = await request.json();
    const orderId = String(payload.orderId || '').trim();
    const order = await getCheckoutOrder(orderId);
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

    if (order.paymentGateway !== 'oceanpayment' || (payload.paymentMethod && payload.paymentMethod !== order.paymentMethod)) {
      return Response.json({message: 'This payment method does not match the order.'}, {status: 409});
    }
    const method = paymentMethodToOceanpayment(order.paymentMethod);
    if (!onlinePaymentAvailable(order.productSlug, method)) {
      return Response.json({ok: true, status: 'manual_follow_up', order: {id: order.id},
        message: 'Your order was saved. COWIN will follow up with payment instructions.'
      }, {headers: {'Cache-Control': 'private, no-store'}});
    }
    const scene: OceanpaymentScene = payload.scene === 'non-3d' ? 'non-3d' : '3d';
    const checkoutUrl = typeof payload.checkoutUrl === 'string' ? payload.checkoutUrl : undefined;
    const forceTestMode = order.productSlug === 'payment-test';
    const oceanpayment = buildOceanpaymentPayload({
      order,
      method,
      scene,
      locale: String(payload.locale || ''),
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
        : 'Online card payment is not active yet. COWIN sales will send payment instructions manually.'
    }, {preparePayment: true});

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
    }).catch(() => console.error('[oceanpayment] payment request analytics failed', order.id));

    return Response.json({
      ok: true,
      status: oceanpayment.configured ? 'ready_to_submit' : 'manual_follow_up',
      message: oceanpayment.configured
        ? 'Secure payment request is ready.'
        : 'Order received. COWIN sales will confirm quotation, logistics and payment instructions by email.',
      order: {id: updated?.id || order.id},
      oceanpayment: {
        configured: oceanpayment.configured,
        testMode: oceanpayment.testMode,
        gatewayUrl: oceanpayment.gatewayUrl,
        fields: oceanpayment.fields,
        billing: oceanpayment.billing
      }
    }, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    if (error instanceof Error && ['PAYMENT_HOLD_EXPIRED', 'PAYMENT_STATE_CHANGED'].includes(error.message)) {
      return Response.json({message: error.message === 'PAYMENT_HOLD_EXPIRED' ? 'Your stock reservation expired. Please start a new checkout.' : 'This order has a payment result. Check your order status before paying again.'}, {status: 409});
    }
    console.error('Oceanpayment create failed', error);
    if (error instanceof Error && /billing address|billing_state|state\/province/i.test(error.message)) {
      return Response.json({message: error.message}, {status: 422});
    }
    return Response.json({message: 'Oceanpayment request failed'}, {status: 500});
  }
}

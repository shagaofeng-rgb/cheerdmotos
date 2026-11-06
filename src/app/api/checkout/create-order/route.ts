import {after} from 'next/server';
import {oneTimePaymentSlug} from '@/lib/site';
import {createStoreOrder, appendAnalyticsEvent, paymentMethods, type PaymentMethod} from '@/lib/commerceStore';
import {getCustomerSession} from '@/lib/customerAuth';
import {sendAdminOrderNotice} from '@/lib/emailService';
import {issueCheckoutReceipt} from '@/lib/checkoutReceipt';
import {getCurrentCart} from '@/lib/cartStore';
import {persistentWritesAvailable} from '@/lib/durableStore';
import {onlinePaymentAvailable, paymentMethodToOceanpayment} from '@/lib/oceanpayment';
import {classifyTraffic, compactAttribution} from '@/lib/trafficAttribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value: unknown, limit = 240) {
  return String(value || '').trim().slice(0, limit);
}

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
    if (!persistentWritesAvailable()) return Response.json({message: 'Checkout is temporarily unavailable.'}, {status: 503});
    const payload = await request.json().catch(() => null);
    const productSlug = clean(payload?.productSlug, 120);
    if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(productSlug)) {
      return Response.json({message: 'Invalid product'}, {status: 400});
    }
    const paymentMethod = (payload.paymentMethod || 'qianhai_card') as PaymentMethod;
    if (!paymentMethods.includes(paymentMethod)) return Response.json({message: 'Invalid payment method'}, {status: 400});
    if (productSlug === oneTimePaymentSlug && !paymentMethod.startsWith('oceanpayment')) {
      return Response.json({message: 'This one-time payment link only supports Oceanpayment online collection.'}, {status: 400});
    }
    if (productSlug === oneTimePaymentSlug && !onlinePaymentAvailable(productSlug, paymentMethodToOceanpayment(paymentMethod))) {
      return Response.json({message: 'This payment link is temporarily unavailable.'}, {status: 503});
    }
    const customer = {
      name: clean(payload.customer?.name, 120),
      email: clean(payload.customer?.email, 160).toLowerCase(),
      phone: clean(payload.customer?.phone, 80),
      company: clean(payload.customer?.company, 160),
      country: clean(payload.customer?.country, 100),
      address: clean(payload.customer?.address, 260),
      message: clean(payload.customer?.message, 500)
    };
    if (!customer.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || !customer.phone || !customer.country || !customer.address) {
      return Response.json({message: 'Please complete required fields'}, {status: 400});
    }

    const purchaseSource = payload.purchaseSource === 'cart' ? 'cart' : 'direct';
    const quantity = Number(payload.quantity ?? 1);
    const quote = [payload.expectedPriceCents, payload.expectedShippingCents];
    if (quote.some((value) => value !== undefined && (!Number.isSafeInteger(value) || value < 0))) {
      return Response.json({message: 'Invalid checkout quote'}, {status: 400});
    }
    const [session, cart] = await Promise.all([getCustomerSession(), purchaseSource === 'cart' ? getCurrentCart() : null]);
    const {order, created} = await createStoreOrder({
      productSlug,
      quantity,
      paymentMethod,
      purchaseSource,
      cartAuthorized: Boolean(cart?.items.some((item) => item.productSlug === productSlug && item.quantity >= quantity)),
      expectedPriceCents: payload.expectedPriceCents,
      expectedShippingCents: payload.expectedShippingCents,
      idempotencyKey: clean(payload.idempotencyKey || payload.clientRequestId, 120),
      userId: session?.email === customer.email ? session.userId : undefined,
      attribution: compactAttribution(payload.attribution),
      customer,
      checkout: {
        contact: clean(payload.checkout?.contact, 160),
        firstName: clean(payload.checkout?.firstName, 80),
        lastName: clean(payload.checkout?.lastName, 80),
        apartment: clean(payload.checkout?.apartment, 160),
        city: clean(payload.checkout?.city, 120),
        state: clean(payload.checkout?.state, 120),
        zip: clean(payload.checkout?.zip, 40),
        shippingMethod: clean(payload.checkout?.shippingMethod, 80),
        couponCode: clean(payload.checkout?.couponCode, 80),
        marketingOptIn: Boolean(payload.checkout?.marketingOptIn),
        billingSameAsShipping: payload.checkout?.billingSameAsShipping !== false,
        billingAddress: clean(payload.checkout?.billingAddress, 260),
        cardBrand: clean(payload.checkout?.cardBrand, 40),
        cardLast4: clean(payload.checkout?.cardLast4, 4),
        cardholderName: clean(payload.checkout?.cardholderName, 120)
      }
    });
    await issueCheckoutReceipt(order.id);
    if (created) after(async () => {
      const results = await Promise.allSettled([sendAdminOrderNotice(order, 'order_submitted'), appendAnalyticsEvent({
      id: `${Date.now()}-checkout-submit`,
      type: 'checkout_submit',
      visitorId: 'checkout',
      sessionId: order.id,
      page: '/checkout',
      pageTitle: 'Project Order',
      referrer: '',
      country: customer.country,
      city: '',
      device: 'Unknown',
      browser: 'Unknown',
      os: 'Unknown',
      ip: clientIp(request),
      timestamp: new Date().toISOString(),
      attribution: order.attribution || {
        visitorId: 'checkout',
        sessionId: order.id,
        firstTouch: classifyTraffic({url: '/checkout', referrer: ''}),
        lastTouch: classifyTraffic({url: '/checkout', referrer: ''}),
        sessionTouch: classifyTraffic({url: '/checkout', referrer: ''})
      },
        payload: {orderId: order.id, total: order.total, productSlug, paymentMethod: order.paymentMethod}
      })]);
      if (results.some((result) => result.status === 'rejected')) console.error('[checkout] order follow-up failed', order.id);
    });
    return Response.json({ok: true, order: {id: order.id}}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        ONE_TIME_PAYMENT_UNAVAILABLE: 'This one-time payment link is no longer available.',
        PRODUCT_UNAVAILABLE: 'This product is no longer available for checkout.',
        INSUFFICIENT_STOCK: 'The requested quantity is no longer available.',
        IDEMPOTENCY_CONFLICT: 'This checkout request has already been used. Please reload checkout.',
        QUOTE_CHANGED: 'The price or delivery charge has changed. Reload checkout to review the new total.'
      };
      if (error.message === 'INVALID_QUANTITY') return Response.json({message: 'Choose a whole quantity from 1 to 99.'}, {status: 400});
      if (Object.hasOwn(messages, error.message)) return Response.json({message: messages[error.message], code: error.message}, {status: 409});
    }
    console.error('Create order failed', error);
    return Response.json({message: 'Order submission failed'}, {status: 500});
  }
}

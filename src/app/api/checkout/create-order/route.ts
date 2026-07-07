import {cookies} from 'next/headers';
import {checkoutProductSlugs, oneTimePaymentSlug, type CheckoutProductSlug} from '@/lib/site';
import {createStoreOrder, appendAnalyticsEvent} from '@/lib/commerceStore';
import {bindOrdersToCustomer, createCustomerSession, createOrUpdateCustomerUser, customerCookieOptions, findCustomerUserByEmail, getCustomerSession} from '@/lib/customerAuth';
import {sendAdminOrderNotice, sendRegistrationWelcomeEmail} from '@/lib/emailService';
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
    const payload = await request.json();
    const productSlug = payload.productSlug as CheckoutProductSlug;
    if (!checkoutProductSlugs.includes(productSlug)) {
      return Response.json({message: 'Invalid product'}, {status: 400});
    }
    if (productSlug === oneTimePaymentSlug && !String(payload.paymentMethod || '').startsWith('oceanpayment')) {
      return Response.json({message: 'This one-time payment link only supports Oceanpayment online collection.'}, {status: 400});
    }
    const customer = {
      name: clean(payload.customer?.name, 120),
      email: clean(payload.customer?.email, 160),
      phone: clean(payload.customer?.phone, 80),
      company: clean(payload.customer?.company, 160),
      country: clean(payload.customer?.country, 100),
      address: clean(payload.customer?.address, 260),
      message: clean(payload.customer?.message, 500)
    };
    if (!customer.name || !customer.email || !customer.phone || !customer.country || !customer.address) {
      return Response.json({message: 'Please complete required fields'}, {status: 400});
    }

    const session = await getCustomerSession();
    const normalizedEmail = customer.email.toLowerCase();
    const existingUser = await findCustomerUserByEmail(normalizedEmail);
    const accountUser = existingUser || await createOrUpdateCustomerUser({
      email: normalizedEmail,
      name: customer.name || normalizedEmail,
      country: customer.country,
      activate: true
    });
    const order = await createStoreOrder({
      productSlug,
      quantity: Number(payload.quantity || 1),
      paymentMethod: payload.paymentMethod || 'qianhai_card',
      idempotencyKey: clean(payload.idempotencyKey || payload.clientRequestId, 120),
      userId: session?.email?.toLowerCase() === normalizedEmail ? session.userId || accountUser.id : accountUser.id,
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
    await sendAdminOrderNotice(order, 'order_submitted');
    await bindOrdersToCustomer(normalizedEmail, accountUser.id);
    if (!existingUser) await sendRegistrationWelcomeEmail(accountUser.email, accountUser.name);
    if (!session || session.email?.toLowerCase() !== normalizedEmail) {
      const cookieStore = await cookies();
      cookieStore.set('cheerdmoto_customer_session', createCustomerSession(accountUser), customerCookieOptions());
    }
    await appendAnalyticsEvent({
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
      payload: {orderId: order.id, total: order.total, productSlug, paymentMethod: order.paymentMethod, cardBrand: order.checkout.cardBrand}
    });
    return Response.json({ok: true, order});
  } catch (error) {
    if (error instanceof Error && error.message === 'ONE_TIME_PAYMENT_UNAVAILABLE') {
      return Response.json({message: 'This one-time payment link is no longer available.'}, {status: 409});
    }
    console.error('Create order failed', error);
    return Response.json({message: 'Order submission failed'}, {status: 500});
  }
}

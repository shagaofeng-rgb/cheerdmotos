import {appendAnalyticsEvent, findStoreOrder, updateStoreOrderPayment} from '@/lib/commerceStore';
import {sendAdminPaymentNotice} from '@/lib/emailService';
import {oceanpaymentStatusToOrder, parseGatewayPayload, verifyOceanpaymentReturn} from '@/lib/oceanpayment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleBack(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get('locale') || 'en';
  const fields = request.method === 'GET' ? Object.fromEntries(url.searchParams.entries()) : await parseGatewayPayload(request);
  const orderId = fields.order_number || fields.orderNo || fields.order_id || '';
  const verified = verifyOceanpaymentReturn(fields);
  const paymentPatch = oceanpaymentStatusToOrder(fields);
  const paymentId = fields.payment_id || fields.transaction_id || fields.trade_no || '';
  if (orderId && verified) {
    const existingOrder = await findStoreOrder(orderId);
    if (existingOrder?.status !== 'paid') {
      const updatedOrder = await updateStoreOrderPayment(orderId, {
        paymentGateway: 'oceanpayment',
        paymentId,
        transactionId: paymentId,
        ...(paymentPatch.status === 'paid'
          ? {
              status: 'processing' as const,
              gatewayStatus: 'processing' as const,
              logisticsStatus: 'Payment return verified. Waiting for Oceanpayment async notice before marking the order as paid.'
            }
          : paymentPatch)
      });
      if (updatedOrder) {
        await sendAdminPaymentNotice(updatedOrder, {
          source: 'oceanpayment_return',
          verified,
          paymentStatus: fields.payment_status || fields.status || paymentPatch.status,
          paymentId,
          detail: 'Buyer returned from Oceanpayment payment page.'
        });
      }
    } else if (existingOrder) {
      await sendAdminPaymentNotice(existingOrder, {
        source: 'oceanpayment_return',
        verified,
        paymentStatus: fields.payment_status || fields.status || paymentPatch.status,
        paymentId,
        detail: 'Buyer returned from Oceanpayment payment page. Order was already marked paid or finalized.'
      });
    }
  } else if (orderId) {
    const existingOrder = await findStoreOrder(orderId);
    if (existingOrder) {
      await sendAdminPaymentNotice(existingOrder, {
        source: 'oceanpayment_return',
        verified,
        paymentStatus: fields.payment_status || fields.status || (paymentPatch.status === 'failed' ? 'failed' : 'unverified'),
        paymentId,
        detail: 'Buyer returned from Oceanpayment but the payment response was failed or unverified.'
      });
    }
  }

  if (orderId) {
    await appendAnalyticsEvent({
      id: `${Date.now()}-oceanpayment-back`,
      type: 'payment_return',
      visitorId: 'payment-gateway',
      sessionId: orderId,
      page: '/api/payments/oceanpayment/back',
      pageTitle: 'Oceanpayment Return',
      referrer: 'Oceanpayment',
      country: '',
      city: '',
      device: 'Gateway',
      browser: 'Gateway',
      os: 'Gateway',
      timestamp: new Date().toISOString(),
      payload: {orderId, verified, paymentStatus: fields.payment_status || fields.status, paymentId}
    });
  }

  const destination = !orderId
    ? `/${locale}/checkout/failed?payment=unmatched`
    : !verified || paymentPatch.status === 'failed'
      ? `/${locale}/checkout/failed?order=${encodeURIComponent(orderId)}&payment=${verified ? 'failed' : 'unverified'}`
      : `/${locale}/checkout/success?order=${encodeURIComponent(orderId)}&payment=${paymentPatch.status === 'paid' ? 'verified' : 'processing'}`;
  return Response.redirect(new URL(destination, request.url), 303);
}

export async function GET(request: Request) {
  return handleBack(request);
}

export async function POST(request: Request) {
  return handleBack(request);
}

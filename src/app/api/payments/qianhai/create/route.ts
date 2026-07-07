export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const payload = await request.json();
  const merchantId = process.env.QIANHAI_MERCHANT_ID;
  const gatewayUrl = process.env.QIANHAI_GATEWAY_URL;

  if (!merchantId || !gatewayUrl) {
    return Response.json(
      {
        ok: false,
        status: 'waiting_for_credentials',
        message: 'Qianhai credit card gateway credentials are not configured yet.',
        requiredEnv: ['QIANHAI_MERCHANT_ID', 'QIANHAI_GATEWAY_URL', 'QIANHAI_SECRET_KEY', 'QIANHAI_NOTIFY_URL'],
        received: {
          orderId: payload.orderId,
          amount: payload.amount,
          currency: payload.currency || 'USD'
        }
      },
      {status: 202}
    );
  }

  return Response.json({
    ok: true,
    status: 'ready_to_submit',
    gatewayUrl,
    merchantId,
    orderId: payload.orderId,
    amount: payload.amount,
    currency: payload.currency || 'USD',
    note: 'Add Qianhai signature, request fields and redirect/token logic here after the acquirer provides API documentation.'
  });
}

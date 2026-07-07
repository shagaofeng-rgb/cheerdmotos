export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-qianhai-signature') || request.headers.get('signature') || '';

  return Response.json({
    ok: true,
    status: 'callback_received',
    received: Boolean(rawBody || signature),
    message: 'Verify Qianhai signature and update order status here after gateway documentation is available.'
  });
}

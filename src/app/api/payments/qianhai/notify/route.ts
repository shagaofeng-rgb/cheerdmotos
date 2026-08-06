export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return Response.json({
    ok: false,
    status: 'not_configured',
    message: 'Qianhai payment callbacks are not configured. No payment status was accepted or changed.'
  }, {status: 501});
}

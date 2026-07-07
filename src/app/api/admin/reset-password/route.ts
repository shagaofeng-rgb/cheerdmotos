export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get('token') || '').trim();
  console.info('Admin password reset submitted', {hasToken: Boolean(token)});
  return Response.redirect(new URL('/admin/login?reset=manual-required', request.url), 303);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  console.info('Admin password reset requested', {email, smtpReady: Boolean(process.env.SMTP_HOST && process.env.SMTP_PASSWORD)});
  return Response.redirect(new URL('/admin/login?reset=requested', request.url), 303);
}

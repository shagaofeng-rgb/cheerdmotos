import {getCustomerSession, verifyCustomerCredentials, createOrUpdateCustomerUser} from '@/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) return Response.json({message: 'Login required'}, {status: 401});
  const payload = await request.json().catch(() => ({}));
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  if (newPassword.length < 8) {
    return Response.json({message: 'New password must be at least 8 characters.'}, {status: 400});
  }
  const email = session.email || '';
  if (!email) return Response.json({message: 'Login required'}, {status: 401});
  const user = await verifyCustomerCredentials(email, currentPassword);
  if (!user) return Response.json({message: 'Current password is incorrect.'}, {status: 400});
  await createOrUpdateCustomerUser({email: user.email, name: user.name, password: newPassword, activate: true});
  return Response.json({ok: true});
}

import {findCustomerUserById, getCustomerSession, updateCustomerProfile} from '@/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value: unknown, limit = 160) {
  return String(value || '').trim().slice(0, limit);
}

export async function PATCH(request: Request) {
  const session = await getCustomerSession();
  if (!session) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  const userId = session.userId || '';
  if (!userId) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  const current = await findCustomerUserById(userId);
  if (!current) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  const payload = await request.json().catch(() => ({}));
  const firstName = clean(payload.firstName, 80);
  const lastName = clean(payload.lastName, 80);
  const country = clean(payload.country, 120);
  const name = clean(payload.name || `${firstName} ${lastName}`.trim() || current.name, 160);
  const user = await updateCustomerProfile(current.id, {name, firstName, lastName, country});
  if (!user) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  return Response.json(
    {ok: true, user: {id: user.id, email: user.email, name: user.name, firstName: user.firstName, lastName: user.lastName, country: user.country}},
    {headers: {'Cache-Control': 'private, no-store'}}
  );
}

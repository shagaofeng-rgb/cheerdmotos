import {findCustomerUserById, getCustomerSession} from '@/lib/customerAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  const userId = session.userId || '';
  if (!userId) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  const user = await findCustomerUserById(userId);
  if (!user) return Response.json({message: 'Login required'}, {status: 401, headers: {'Cache-Control': 'private, no-store'}});
  return Response.json(
    {ok: true, user: {id: user.id, email: user.email, name: user.name, firstName: user.firstName, lastName: user.lastName, country: user.country, status: user.status}},
    {headers: {'Cache-Control': 'private, no-store'}}
  );
}

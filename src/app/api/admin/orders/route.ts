import {requireAdminApiSession} from '@/lib/adminAuth';
import {readStoreOrders} from '@/lib/commerceStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  return Response.json({orders: (await readStoreOrders()).slice().reverse()});
}

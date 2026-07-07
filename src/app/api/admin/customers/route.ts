import {requireAdminApiSession} from '@/lib/adminAuth';
import {buildCustomerLeads} from '@/lib/backendStore';
import {readAnalyticsEvents, readStoreOrders} from '@/lib/commerceStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const [orders, events] = await Promise.all([readStoreOrders(), readAnalyticsEvents()]);
  return Response.json({customers: buildCustomerLeads(orders, events).filter((lead) => lead.email || lead.phone)});
}

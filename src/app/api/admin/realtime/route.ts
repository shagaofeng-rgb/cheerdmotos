import crypto from 'node:crypto';
import {requireAdminApiSession} from '@/lib/adminAuth';
import {buildCustomerLeads, getAdminDashboardData} from '@/lib/backendStore';
import {getCommerceSnapshot, readAnalyticsEvents, readStoreOrders} from '@/lib/commerceStore';
import {durableStoreStatus} from '@/lib/durableStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function latest(values: string[]) {
  return values.filter(Boolean).sort().at(-1) || '';
}

function hash(value: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex').slice(0, 16);
}

export async function GET() {
  const {response} = await requireAdminApiSession();
  if (response) return response;

  const [orders, events, snapshot, backend] = await Promise.all([
    readStoreOrders(),
    readAnalyticsEvents(),
    getCommerceSnapshot(),
    getAdminDashboardData()
  ]);
  const leads = buildCustomerLeads(orders, events);
  const state = {
    orders: orders.length,
    events: events.length,
    leads: leads.length,
    products: backend.metrics.products,
    posts: backend.metrics.posts,
    latestOrder: latest(orders.map((order) => order.updatedAt || order.createdAt)),
    latestEvent: latest(events.map((event) => event.timestamp)),
    latestLead: latest(leads.map((lead) => lead.lastActiveTime))
  };

  return Response.json(
    {
      ok: true,
      generatedAt: new Date().toISOString(),
      version: hash(state),
      store: durableStoreStatus(),
      state,
      metrics: {
        ...snapshot.metrics,
        leads: leads.length,
        products: backend.metrics.products,
        publishedProducts: backend.metrics.publishedProducts,
        posts: backend.metrics.posts,
        conversionRate: backend.metrics.conversionRate
      },
      recent: {
        orders: orders.slice(-5).reverse(),
        events: events.slice(-5).reverse(),
        leads: leads.slice(0, 5)
      }
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    }
  );
}

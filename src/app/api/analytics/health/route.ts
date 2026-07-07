import {readAnalyticsEvents} from '@/lib/commerceStore';
import {durableStoreStatus} from '@/lib/durableStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const store = durableStoreStatus();
  try {
    const events = await readAnalyticsEvents();
    const latestEvent = events.map((event) => event.timestamp).filter(Boolean).sort().at(-1) || '';
    return Response.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        store,
        eventCount: events.length,
        latestEvent,
        warning: store.configured ? '' : 'Analytics is using temporary serverless storage. Configure BLOB_READ_WRITE_TOKEN, KV_REST_API_URL + KV_REST_API_TOKEN, or Upstash Redis REST credentials for stable realtime data.'
      },
      {headers: {'Cache-Control': 'no-store, no-cache, must-revalidate'}}
    );
  } catch (error) {
    console.error('Analytics health check failed', {
      store: store.provider,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return Response.json(
      {
        ok: false,
        generatedAt: new Date().toISOString(),
        store,
        eventCount: 0,
        latestEvent: '',
        warning: 'Analytics data source is not readable.'
      },
      {status: 503, headers: {'Cache-Control': 'no-store, no-cache, must-revalidate'}}
    );
  }
}

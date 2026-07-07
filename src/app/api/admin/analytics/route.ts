import {requireAdminApiSession} from '@/lib/adminAuth';
import {getAdminDashboardData} from '@/lib/backendStore';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const url = new URL(request.url);
  const timeFilter = parseAdminTimeFilter(Object.fromEntries(url.searchParams.entries()));
  const data = await getAdminDashboardData({from: timeFilter.from, to: timeFilter.to});
  return Response.json({
    filter: {
      range: timeFilter.range,
      start: timeFilter.start,
      end: timeFilter.end,
      timezone: timeFilter.timezone
    },
    metrics: data.metrics,
    events: data.events,
    countries: data.countries,
    trafficSources: data.trafficSources,
    popularProducts: data.popularProducts
  });
}

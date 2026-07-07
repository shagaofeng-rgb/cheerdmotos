import {requireAdminApiSession} from '@/lib/adminAuth';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getAcquisitionReport} from '@/lib/trafficReports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const url = new URL(request.url);
  const timeFilter = parseAdminTimeFilter(Object.fromEntries(url.searchParams.entries()));
  const model = (url.searchParams.get('model') || 'last') as 'first' | 'last' | 'session';
  const report = await getAcquisitionReport({from: timeFilter.from, to: timeFilter.to, model});
  return Response.json({filter: {...timeFilter, model}, ...report}, {
    headers: {'Cache-Control': 'no-store, no-cache, must-revalidate'}
  });
}

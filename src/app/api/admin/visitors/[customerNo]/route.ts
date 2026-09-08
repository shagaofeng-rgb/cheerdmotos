import {requireAdminApiSession} from '@/lib/adminAuth';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getVisitorJourney} from '@/lib/visitorRecords';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, {params}: {params: Promise<{customerNo: string}>}) {
  const {response} = await requireAdminApiSession();
  if (response) return response;
  const [{customerNo}, url] = await Promise.all([params, Promise.resolve(new URL(request.url))]);
  const timeFilter = parseAdminTimeFilter(Object.fromEntries(url.searchParams.entries()));
  const visitor = await getVisitorJourney(customerNo, {from: timeFilter.from, to: timeFilter.to});
  if (!visitor) return Response.json({ok: false, message: '访客不存在'}, {status: 404});
  return Response.json({ok: true, filter: {range: timeFilter.range, start: timeFilter.start, end: timeFilter.end, timezone: timeFilter.timezone}, visitor}, {headers: {'Cache-Control': 'no-store, no-cache, must-revalidate'}});
}

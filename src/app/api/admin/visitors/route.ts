import {requireAdminApiSession} from '@/lib/adminAuth';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getVisitorRecords, visitorRecordsCsv} from '@/lib/visitorRecords';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const {response} = await requireAdminApiSession();
  if (response) return response;

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const timeFilter = parseAdminTimeFilter(params);
  const format = url.searchParams.get('format');
  const report = await getVisitorRecords({
    from: timeFilter.from,
    to: timeFilter.to,
    q: url.searchParams.get('q') || '',
    country: url.searchParams.get('country') || '',
    source: url.searchParams.get('source') || '',
    page: Number(url.searchParams.get('page') || 1),
    perPage: format === 'csv' ? 10000 : Number(url.searchParams.get('perPage') || 10)
  });

  if (format === 'csv') {
    return new Response(`\uFEFF${visitorRecordsCsv(report.records)}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cheerdmoto-visitor-records-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  }

  return Response.json(
    {
      filter: {
        range: timeFilter.range,
        start: timeFilter.start,
        end: timeFilter.end,
        timezone: timeFilter.timezone
      },
      ...report
    },
    {headers: {'Cache-Control': 'no-store, no-cache, must-revalidate'}}
  );
}

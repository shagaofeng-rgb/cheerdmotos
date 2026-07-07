import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {zhBrowser, zhCountry, zhDeviceName, zhSourceDetail, zhTrafficPlatform, zhTrafficSource} from '@/lib/adminLabels';
import {parseAdminPagination} from '@/lib/adminPagination';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getVisitorRecords} from '@/lib/visitorRecords';

export const dynamic = 'force-dynamic';

function dateTime(value: string) {
  return value ? value.slice(0, 19).replace('T', ' ') : '-';
}

function exportHref(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'page' || key === 'perPage') return;
    if (Array.isArray(value)) value.forEach((item) => item && search.append(key, item));
    else if (value) search.set(key, value);
  });
  search.set('format', 'csv');
  return `/api/admin/visitors?${search.toString()}`;
}

export default async function AdminVisitorsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const q = typeof params.q === 'string' ? params.q : '';
  const country = typeof params.country === 'string' ? params.country : '';
  const source = typeof params.source === 'string' ? params.source : '';
  const report = await getVisitorRecords({
    from: timeFilter.from,
    to: timeFilter.to,
    q,
    country,
    source,
    page,
    perPage
  });

  return (
    <AdminShell active="visitors">
      <div className="admin-title">
        <p className="eyebrow">访客记录</p>
        <h1>访客记录</h1>
        <p>按真实前台访客事件记录客户编号、国家、设备、浏览器、来源、访问页面、客户标签、访问日和 IP。支付网关回调与后台操作不会混入访客记录。</p>
        <AdminTimeFilter action="/admin/visitors" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="访客记录时间" summary={timeFilter.summary} />
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">数据源</p>
          <h2>{report.store.configured ? 'Analytics 数据库已连接' : 'Analytics 当前不是稳定存储'}</h2>
          <p>当前数据源：{report.store.provider}；记录数：{report.total}；生成时间：{dateTime(report.generatedAt)}</p>
        </div>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">最近访客</p>
          <h2>最近访客记录</h2>
        </div>
        <form className="admin-time-filter" action="/admin/visitors" method="get">
          <input name="range" type="hidden" value={timeFilter.range} />
          {timeFilter.start ? <input name="start" type="hidden" value={timeFilter.start} /> : null}
          {timeFilter.end ? <input name="end" type="hidden" value={timeFilter.end} /> : null}
          <input name="page" type="hidden" value="1" />
          <input name="perPage" type="hidden" value={perPage} />
          <label>
            <span>搜索</span>
            <input name="q" placeholder="客户编号、页面、IP、来源" defaultValue={q} />
          </label>
          <label>
            <span>国家</span>
            <input name="country" placeholder="例如 美国 / 菲律宾 / US" defaultValue={country} />
          </label>
          <label>
            <span>来源</span>
            <input name="source" placeholder="付费社媒 / Meta / Google" defaultValue={source} />
          </label>
          <button type="submit">筛选</button>
          <a className="button secondary small" href={exportHref(params)}>导出 CSV</a>
        </form>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>客户编号</th>
                <th>国家</th>
                <th>设备</th>
                <th>浏览器</th>
                <th>来源</th>
                <th>来源平台</th>
                <th>来源详情</th>
                <th>页面</th>
                <th>客户标签</th>
                <th>访问日</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {report.records.length ? report.records.map((record) => (
                <tr key={`${record.time}-${record.customerNo}-${record.page}`}>
                  <td>{dateTime(record.time)}</td>
                  <td>{record.customerNo}</td>
                  <td>{zhCountry(record.country)}</td>
                  <td>{zhDeviceName(record.device)}</td>
                  <td>{zhBrowser(record.browser)}</td>
                  <td>{zhTrafficSource(record.source)}</td>
                  <td>{zhTrafficPlatform(record.sourcePlatform)}</td>
                  <td>{zhSourceDetail(record.sourceDetail)}</td>
                  <td>{record.page}</td>
                  <td>{record.customerTag}</td>
                  <td>{record.visitDay}</td>
                  <td>{record.ip || '-'}</td>
                </tr>
              )) : <tr><td colSpan={12}>暂无访客记录。前台产生真实访问后会自动进入这里。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/visitors" params={params} page={report.page} perPage={report.perPage} total={report.total} totalPages={report.totalPages} />
      </section>
    </AdminShell>
  );
}

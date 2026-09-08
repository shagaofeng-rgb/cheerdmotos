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
  const device = typeof params.device === 'string' ? params.device : '';
  const tag = typeof params.tag === 'string' ? params.tag : '';
  const report = await getVisitorRecords({
    from: timeFilter.from,
    to: timeFilter.to,
    q,
    country,
    source,
    device,
    tag,
    page,
    perPage
  });

  return (
    <AdminShell active="visitors">
      <div className="admin-title">
        <p className="eyebrow">访客记录</p>
        <h1>访客记录</h1>
        <p>按稳定客户编号归并真实前台访问。测试、Collects、采集器、支付回调与后台操作不会混入经营数据。</p>
        <AdminTimeFilter action="/admin/visitors" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="访客记录时间" summary={timeFilter.summary} />
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">数据源</p>
          <h2>{report.store.configured ? 'Analytics 数据库已连接' : 'Analytics 当前不是稳定存储'}</h2>
          <p>当前数据源：{report.store.provider}；客户数：{report.total}；生成时间：{dateTime(report.generatedAt)}</p>
        </div>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">客户归属</p>
          <h2>访客客户列表</h2>
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
          <label>
            <span>设备</span>
            <select name="device" defaultValue={device}>
              <option value="">全部设备</option>
              <option value="Desktop">桌面端</option>
              <option value="Mobile">手机端</option>
              <option value="Tablet">平板</option>
            </select>
          </label>
          <label>
            <span>客户分层</span>
            <select name="tag" defaultValue={tag}>
              <option value="">全部客户</option>
              <option value="新访客">新访客</option>
              <option value="回访">回访访客</option>
              <option value="结账">结账意向客户</option>
              <option value="留资">已留资客户</option>
              <option value="下单">已下单客户</option>
            </select>
          </label>
          <button type="submit">筛选</button>
          <a className="button secondary small" href={exportHref(params)}>导出 CSV</a>
        </form>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>客户编号</th>
                <th>首次 / 最近访问</th>
                <th>国家</th>
                <th>设备</th>
                <th>浏览器</th>
                <th>来源</th>
                <th>来源平台</th>
                <th>来源详情</th>
                <th>最近页面</th>
                <th>客户标签</th>
                <th>会话 / 浏览</th>
                <th>IP</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {report.records.length ? report.records.map((record) => (
                <tr key={record.customerNo}>
                  <td><strong>{record.customerNo}</strong></td>
                  <td>{dateTime(record.firstSeen)}<br /><small>{dateTime(record.lastSeen)}</small></td>
                  <td>{zhCountry(record.country)}</td>
                  <td>{zhDeviceName(record.device)}</td>
                  <td>{zhBrowser(record.browser)}</td>
                  <td>{zhTrafficSource(record.source)}</td>
                  <td>{zhTrafficPlatform(record.sourcePlatform)}</td>
                  <td>{zhSourceDetail(record.sourceDetail)}</td>
                  <td>{record.lastPage}</td>
                  <td>{record.customerTag}</td>
                  <td>{record.sessions} 次 / {record.pageViews} PV<br /><small>{record.visitDays} 个访问日</small></td>
                  <td>{record.ip || '-'}</td>
                  <td><Link className="button secondary small" href={`/admin/visitors/${record.customerNo}?range=${timeFilter.range}&start=${timeFilter.start}&end=${timeFilter.end}`}>访问详情</Link></td>
                </tr>
              )) : <tr><td colSpan={14}>暂无真实访客记录。前台产生真实访问后会自动进入这里。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/visitors" params={params} page={report.page} perPage={report.perPage} total={report.total} totalPages={report.totalPages} />
      </section>
    </AdminShell>
  );
}
import Link from 'next/link';

import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {zhBrowser, zhCountry, zhDeviceName, zhSourceDetail, zhTrafficPlatform, zhTrafficSource} from '@/lib/adminLabels';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {zhEventType} from '@/lib/adminZh';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getAdminDashboardData} from '@/lib/backendStore';
import {readAnalyticsEvents, type AnalyticsEvent} from '@/lib/commerceStore';
import {durableStoreStatus} from '@/lib/durableStore';
import {classifyTraffic, type AttributionSnapshot} from '@/lib/trafficAttribution';

export const dynamic = 'force-dynamic';

function inRange(timestamp: string, from?: Date, to?: Date) {
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  if (from && time < from.getTime()) return false;
  if (to && time > to.getTime()) return false;
  return true;
}

function eventTouch(event: AnalyticsEvent) {
  const attribution = event.attribution as AttributionSnapshot | null | undefined;
  return attribution?.lastTouch || classifyTraffic({url: event.page, referrer: event.referrer});
}

export default async function AdminAnalyticsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const [data, allEvents] = await Promise.all([
    getAdminDashboardData({from: timeFilter.from, to: timeFilter.to}),
    readAnalyticsEvents()
  ]);
  const events = allEvents
    .filter((event) => inRange(event.timestamp, timeFilter.from, timeFilter.to))
    .slice()
    .reverse();
  const pagedEvents = paginate(events, page, perPage);
  const store = durableStoreStatus();

  return (
    <AdminShell active="analytics">
      <div className="admin-title">
        <p className="eyebrow">访问行为</p>
        <h1>访问统计</h1>
        <p>这里显示前台异步埋点采集到的真实访问、产品浏览、CTA 点击和结账行为。</p>
        <AdminTimeFilter action="/admin/analytics" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="访问统计时间" summary={timeFilter.summary} />
      </div>
      <div className="admin-metrics">
        <article><span>UV</span><strong>{data.metrics.visitors}</strong><small>独立匿名访客</small></article>
        <article><span>PV</span><strong>{data.metrics.pageViews}</strong><small>页面访问事件</small></article>
        <article><span>产品浏览</span><strong>{data.metrics.productViews}</strong><small>产品详情页访问</small></article>
        <article><span>结账事件</span><strong>{data.metrics.checkoutEvents}</strong><small>结账或订单相关信号</small></article>
      </div>
      {!store.configured ? (
        <section className="admin-panel">
          <div>
            <p className="eyebrow">数据源状态</p>
            <h2>当前为临时存储</h2>
            <p>生产环境需要配置 Vercel Blob、KV 或 Upstash Redis REST 凭据，否则多实例或重启后实时统计不稳定。</p>
          </div>
        </section>
      ) : null}
      <section className="admin-panel">
        <div>
          <p className="eyebrow">来源与国家</p>
          <h2>需求分布</h2>
        </div>
        <div className="admin-two-col">
          <div className="admin-bar-list">{data.trafficSources.length ? data.trafficSources.map((row) => <p key={row.label}><span>{row.label}</span><strong>{row.value}</strong></p>) : <p><span>暂无真实来源数据</span><strong>0</strong></p>}</div>
          <div className="admin-bar-list">{data.countries.length ? data.countries.map((row) => <p key={row.label}><span>{zhCountry(row.label)}</span><strong>{row.value}</strong></p>) : <p><span>暂无真实国家/地区数据</span><strong>0</strong></p>}</div>
        </div>
      </section>
      <section className="admin-panel">
        <div>
          <p className="eyebrow">最近行为</p>
          <h2>事件日志</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>时间</th><th>事件</th><th>页面</th><th>设备</th><th>国家/地区</th><th>来源</th><th>来源平台</th><th>来源详情</th></tr></thead>
            <tbody>
              {pagedEvents.items.length ? pagedEvents.items.map((event) => {
                const touch = eventTouch(event);
                return (
                  <tr key={event.id}>
                    <td>{event.timestamp.slice(0, 19).replace('T', ' ')}</td>
                    <td>{zhEventType(event.type)}</td>
                    <td>{event.page}</td>
                    <td>{zhDeviceName(event.device)} / {zhBrowser(event.browser)}</td>
                    <td>{zhCountry(event.country)}</td>
                    <td>{zhTrafficSource(touch.channel)}</td>
                    <td>{zhTrafficPlatform(touch.source)}</td>
                    <td>{zhSourceDetail([
                      touch.source ? `source=${touch.source}` : '',
                      touch.medium ? `medium=${touch.medium}` : '',
                      touch.campaign ? `campaign=${touch.campaign}` : '',
                      touch.clickIdType ? `click_id=${touch.clickIdType}` : '',
                      touch.referrerDomain ? `referrer=${touch.referrerDomain}` : ''
                    ].filter(Boolean).join(' / '))}</td>
                  </tr>
                );
              }) : <tr><td colSpan={8}>暂无真实访问事件。前台页面打开后会异步记录。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/analytics" params={params} page={pagedEvents.page} perPage={pagedEvents.perPage} total={pagedEvents.total} totalPages={pagedEvents.totalPages} />
      </section>
    </AdminShell>
  );
}

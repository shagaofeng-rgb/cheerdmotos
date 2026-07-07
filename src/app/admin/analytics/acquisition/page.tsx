import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getAcquisitionReport} from '@/lib/trafficReports';

export const dynamic = 'force-dynamic';

type Rows = Awaited<ReturnType<typeof getAcquisitionReport>>['channels'];

function ReportTable({title, rows}: {title: string; rows: Rows}) {
  return (
    <section className="admin-panel">
      <div><p className="eyebrow">Attribution</p><h2>{title}</h2></div>
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Visitors</th><th>Sessions</th><th>PV</th><th>Leads</th><th>Purchases</th><th>CVR</th><th>Top Campaign</th><th>Top Landing</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.visitors}</td>
                <td>{row.sessions}</td>
                <td>{row.pageViews}</td>
                <td>{row.leads}</td>
                <td>{row.purchases}</td>
                <td>{row.conversionRate}%</td>
                <td>{row.topCampaign}</td>
                <td>{row.topLandingPage}</td>
              </tr>
            )) : <tr><td colSpan={9}>No acquisition data yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AcquisitionPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const model = String(params.model || 'last') as 'first' | 'last' | 'session';
  const report = await getAcquisitionReport({from: timeFilter.from, to: timeFilter.to, model});
  return (
    <AdminShell active="acquisition">
      <div className="admin-title">
        <p className="eyebrow">Traffic Acquisition</p>
        <h1>流量来源识别与营销归因</h1>
        <p>按 First Touch、Last Touch 或 Session Source 查看访客、会话、线索、订单和 Campaign 表现。后台实时读取事件存储，不使用演示数据。</p>
        <AdminTimeFilter action="/admin/analytics/acquisition" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="归因统计时间" summary={timeFilter.summary} />
      </div>
      <div className="admin-metrics">
        <article><span>Visitors</span><strong>{report.metrics.visitors}</strong><small>anonymous visitor ids</small></article>
        <article><span>Sessions</span><strong>{report.metrics.sessions}</strong><small>session ids</small></article>
        <article><span>Page Views</span><strong>{report.metrics.pageViews}</strong><small>tracked page views</small></article>
        <article><span>Leads</span><strong>{report.metrics.leads}</strong><small>contact inquiries</small></article>
        <article><span>Purchases</span><strong>{report.metrics.purchases}</strong><small>paid orders</small></article>
        <article><span>CVR</span><strong>{report.metrics.conversionRate}%</strong><small>lead + purchase / visitors</small></article>
        <article><span>Top Source</span><strong>{report.metrics.topSource}</strong><small>{report.model} touch</small></article>
        <article><span>Last Sync</span><strong>{report.lastSyncedAt ? report.lastSyncedAt.slice(0, 16).replace('T', ' ') : '-'}</strong><small>{report.store.provider}</small></article>
      </div>
      {!report.store.configured ? (
        <section className="admin-panel">
          <div><p className="eyebrow">Sync Status</p><h2>当前后台数据同步不稳定</h2><p>当前 provider 是 {report.store.provider}。生产环境建议配置 Vercel Blob 或 Upstash/KV REST，否则 serverless 实例重启后事件数据可能只保存在临时目录，后台统计会丢失或不同步。</p></div>
        </section>
      ) : null}
      <section className="admin-panel">
        <div><p className="eyebrow">Attribution Model</p><h2>归因口径</h2></div>
        <div className="admin-actions">
          <a className="button secondary small" href="/admin/analytics/acquisition?model=first">First Touch</a>
          <a className="button secondary small" href="/admin/analytics/acquisition?model=last">Last Touch</a>
          <a className="button secondary small" href="/admin/analytics/acquisition?model=session">Session Source</a>
        </div>
      </section>
      <ReportTable title="Channel Report" rows={report.channels} />
      <ReportTable title="Platform / Source Report" rows={report.platforms} />
      <ReportTable title="Campaign Report" rows={report.campaigns} />
    </AdminShell>
  );
}

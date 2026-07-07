import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getAcquisitionReport} from '@/lib/trafficReports';

export const dynamic = 'force-dynamic';

type Rows = Awaited<ReturnType<typeof getAcquisitionReport>>['channels'];

function ReportTable({title, rows}: {title: string; rows: Rows}) {
  return (
    <section className="admin-panel">
      <div><p className="eyebrow">来源归因</p><h2>{title}</h2></div>
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>名称</th><th>访客</th><th>会话</th><th>浏览量</th><th>线索</th><th>购买</th><th>转化率</th><th>主要活动</th><th>主要落地页</th></tr></thead>
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
            )) : <tr><td colSpan={9}>暂无来源归因数据。</td></tr>}
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
        <p className="eyebrow">流量来源</p>
        <h1>来源识别与营销归因</h1>
        <p>按首次触达、最后触达或会话来源查看访客、会话、线索、订单和 Campaign 表现。后台实时读取事件存储，不使用演示数据。</p>
        <AdminTimeFilter action="/admin/analytics/acquisition" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="归因统计时间" summary={timeFilter.summary} />
      </div>
      <div className="admin-metrics">
        <article><span>访客</span><strong>{report.metrics.visitors}</strong><small>匿名访客 ID</small></article>
        <article><span>会话</span><strong>{report.metrics.sessions}</strong><small>访问会话 ID</small></article>
        <article><span>浏览量</span><strong>{report.metrics.pageViews}</strong><small>已追踪页面浏览</small></article>
        <article><span>线索</span><strong>{report.metrics.leads}</strong><small>联系和询盘行为</small></article>
        <article><span>购买</span><strong>{report.metrics.purchases}</strong><small>已付款订单</small></article>
        <article><span>转化率</span><strong>{report.metrics.conversionRate}%</strong><small>线索 + 购买 / 访客</small></article>
        <article><span>主要来源</span><strong>{report.metrics.topSource}</strong><small>{report.model} touch</small></article>
        <article><span>最近同步</span><strong>{report.lastSyncedAt ? report.lastSyncedAt.slice(0, 16).replace('T', ' ') : '-'}</strong><small>{report.store.provider}</small></article>
      </div>
      {!report.store.configured ? (
        <section className="admin-panel">
          <div><p className="eyebrow">同步状态</p><h2>当前后台数据同步不是稳定存储</h2><p>当前 provider 是 {report.store.provider}。生产环境建议配置 Vercel Blob 或 Upstash/KV REST，否则 serverless 实例重启后事件数据可能只保存在临时目录，后台统计会丢失或不同步。</p></div>
        </section>
      ) : null}
      <section className="admin-panel">
        <div><p className="eyebrow">归因模型</p><h2>归因口径</h2></div>
        <div className="admin-actions">
          <a className="button secondary small" href="/admin/analytics/acquisition?model=first">首次触达</a>
          <a className="button secondary small" href="/admin/analytics/acquisition?model=last">最后触达</a>
          <a className="button secondary small" href="/admin/analytics/acquisition?model=session">会话来源</a>
        </div>
      </section>
      <ReportTable title="渠道报告" rows={report.channels} />
      <ReportTable title="平台 / 来源报告" rows={report.platforms} />
      <ReportTable title="活动报告" rows={report.campaigns} />
    </AdminShell>
  );
}

import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {getAnalyticsOperationsReport} from '@/lib/analyticsOperations';

export const dynamic = 'force-dynamic';

function dateTime(value: string) {
  return value ? value.slice(0, 19).replace('T', ' ') : '-';
}

export default async function AnalyticsQualityPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const report = await getAnalyticsOperationsReport({from: timeFilter.from, to: timeFilter.to});

  return (
    <AdminShell active="traffic-quality">
      <div className="admin-title">
        <p className="eyebrow">数据治理</p>
        <h1>流量质量</h1>
        <p>这里只展示真实访客统计的过滤规则和处理结果。被排除的测试、Collects 请求、机器人和系统事件不会进入经营看板或访客列表。</p>
        <AdminTimeFilter action="/admin/analytics/quality" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="检查时间" summary={timeFilter.summary} />
      </div>

      <div className="admin-metrics admin-quality-metrics">
        <article><span>真实访客</span><strong>{report.metrics.visitors}</strong><small>已通过质量规则</small></article>
        <article><span>有效会话</span><strong>{report.metrics.sessions}</strong><small>按匿名会话去重</small></article>
        <article><span>排除请求</span><strong>{report.metrics.excluded}</strong><small>仅保留脱敏审计信息</small></article>
        <article><span>最近刷新</span><strong>{dateTime(report.generatedAt).slice(11)}</strong><small>{dateTime(report.generatedAt).slice(0, 10)}</small></article>
      </div>

      <section className="admin-panel admin-quality-panel">
        <div className="admin-panel-heading"><div><p className="eyebrow">质量规则</p><h2>当前生效的过滤边界</h2></div><span className="admin-status-chip is-good">已启用</span></div>
        <div className="admin-governance-grid">
          <article><strong>系统事件</strong><span>后台、支付回调和系统操作永不计入访客。</span></article>
          <article><strong>测试与 Collects</strong><span>带测试标记、preview、collect 或 collects 的请求不会进入统计。</span></article>
          <article><strong>内部访问</strong><span>支持以加密 IP 指纹和访客 ID 前缀排除内部流量。</span></article>
          <article><strong>隐私保护</strong><span>后台只显示脱敏 IP；新增原始 IP 不会写入分析记录。</span></article>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="eyebrow">排除审计</p><h2>本周期被排除的原因</h2></div><a className="button secondary small" href="/admin/visitors">查看真实访客</a></div>
        <div className="admin-two-col">
          <div className="admin-bar-list">
            {report.exclusions.length ? report.exclusions.map((item) => <p key={item.label}><span>{item.label}</span><strong>{item.value}</strong></p>) : <p><span>本周期没有新的排除记录</span><strong>0</strong></p>}
          </div>
          <dl className="admin-config-list">
            <div><dt>内部 IP 指纹规则</dt><dd>{report.governance.internalIpRules} 条</dd></div>
            <div><dt>测试访客前缀</dt><dd>{report.governance.visitorPrefixRules} 条</dd></div>
            <div><dt>自动识别参数</dt><dd>{report.governance.excludedQueryKeys.join(', ')}</dd></div>
            <div><dt>规则生效方式</dt><dd>服务端采集拦截 + 后台读取二次校验</dd></div>
          </dl>
        </div>
      </section>
    </AdminShell>
  );
}

import AdminShell from '@/components/AdminShell';
import {newsAutomationConfigStatus} from '@/lib/newsPublisher';
import {readNewsCandidates, readNewsDeliveries, readNewsPublications, readNewsRuns} from '@/lib/newsAutomationStore';

export const dynamic = 'force-dynamic';

function time(value: string) {
  return value ? value.slice(0, 19).replace('T', ' ') : '-';
}

export default async function AdminNewsAutomationPage() {
  const [config, runs, candidates, publications, deliveries] = await Promise.all([
    Promise.resolve(newsAutomationConfigStatus()),
    readNewsRuns(40),
    readNewsCandidates(80),
    readNewsPublications(40),
    readNewsDeliveries(40)
  ]);
  const latestRun = runs[0];
  const latestSuccess = publications.find((item) => item.result === 'published' && !item.test);
  const latestDelivery = deliveries.find((item) => !item.test);

  return (
    <AdminShell active="news-automation">
      <div className="admin-title">
        <p className="eyebrow">News 自动化</p>
        <h1>新闻自动发布监控</h1>
        <p>跟踪可信 RSS 抓取、来源与相关性过滤、持久化写入、前端详情页和 News Sitemap 交付结果。</p>
      </div>

      <div className="admin-metrics">
        <article><span>运行状态</span><strong>{config.ready ? '已就绪' : '待配置'}</strong><small>{config.store.provider}</small></article>
        <article><span>每日目标</span><strong>{config.dailyTarget}</strong><small>每个窗口最多发布 1 篇</small></article>
        <article><span>最近任务</span><strong>{latestRun?.status || '暂无'}</strong><small>{time(latestRun?.finishedAt || '')}</small></article>
        <article><span>最近发布</span><strong>{latestSuccess ? '已交付' : '暂无记录'}</strong><small>{time(latestSuccess?.createdAt || '')}</small></article>
      </div>

      <section className="admin-panel">
        <div><p className="eyebrow">配置状态</p><h2>来源、规则与交付检查</h2></div>
        <dl className="admin-config-list">
          <div><dt>可信来源</dt><dd>{config.feedCount} 个 RSS；配置来源：{config.feedSource === 'environment' ? '环境变量' : '内置可信默认值'}</dd></div>
          <div><dt>允许域名</dt><dd>{config.allowedDomains.join(', ') || '未配置'}</dd></div>
          <div><dt>自动发布</dt><dd>{config.autoPublish ? '已启用' : '已关闭，仅记录候选'}</dd></div>
          <div><dt>筛选规则</dt><dd>{config.lookbackHours} 小时新鲜度；相关性阈值 {config.relevanceThreshold}；去重窗口 {config.dedupDays} 天</dd></div>
          <div><dt>前端交付检查</dt><dd>{config.deliveryCheck ? '已启用：列表、详情页、News Sitemap 必须全部通过' : '已关闭'}</dd></div>
          <div><dt>最近交付</dt><dd>{latestDelivery ? `${latestDelivery.result}；尝试 ${latestDelivery.attempts} 次；${latestDelivery.error || latestDelivery.detailUrl}` : '暂无交付记录'}</dd></div>
        </dl>
      </section>

      <section className="admin-panel">
        <div><p className="eyebrow">任务日志</p><h2>最近自动发布任务</h2></div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>完成时间</th><th>触发</th><th>状态</th><th>来源</th><th>候选</th><th>发布</th><th>说明</th></tr></thead>
            <tbody>
              {runs.length ? runs.map((run) => (
                <tr key={`${run.id}-${run.finishedAt}`}>
                  <td>{time(run.finishedAt)}</td><td>{run.trigger}</td><td>{run.status}</td><td>{run.sourceCount}</td>
                  <td>{run.acceptedCount}/{run.fetchedCount}</td><td>{run.publishedCount}</td><td>{run.message}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无任务日志，生产 Cron 首次执行后会显示。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <div><p className="eyebrow">候选审计</p><h2>最近来源筛选结果</h2></div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>时间</th><th>结果</th><th>标题</th><th>来源</th><th>相关性</th><th>产品</th><th>说明</th></tr></thead>
            <tbody>
              {candidates.length ? candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td>{time(candidate.createdAt)}</td><td>{candidate.result}</td><td>{candidate.title}</td>
                  <td>{candidate.sourceName}</td><td>{candidate.relevanceScore.toFixed(2)}</td>
                  <td>{candidate.productSlugs.join(', ') || '-'}</td><td>{candidate.reason}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无候选审计记录。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

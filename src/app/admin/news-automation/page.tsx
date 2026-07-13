import AdminShell from '@/components/AdminShell';
import {listAdminPosts} from '@/lib/backendStore';
import {readNewsAudits, readNewsJobLogs} from '@/lib/newsAutomationStore';

export const dynamic = 'force-dynamic';

function todayKey() {
  try {
    return new Intl.DateTimeFormat('en-CA', {timeZone: process.env.NEWS_TIMEZONE || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default async function AdminNewsAutomationPage() {
  const [posts, audits, jobs] = await Promise.all([
    listAdminPosts('news'),
    readNewsAudits(80),
    readNewsJobLogs(40)
  ]);
  const today = todayKey();
  const publishedToday = posts.filter((post) => post.status === 'published' && post.publishDate === today);
  const target = Number(process.env.NEWS_DAILY_TARGET || 4);
  const rssReady = Boolean(process.env.NEWS_RSS_FEEDS || process.env.NEWS_API_KEY);

  return (
    <AdminShell active="news-automation">
      <div className="admin-title">
        <p className="eyebrow">News 自动化</p>
        <h1>News 自动发布系统</h1>
        <p>仅发布通过可信来源、72 小时、语言、产品相关性和 7 天去重校验的内容；不合格候选会保留审计记录。</p>
      </div>

      <div className="admin-metrics">
        <article><span>今日目标</span><strong>{target}</strong><small>NEWS_DAILY_TARGET</small></article>
        <article><span>今日已发布</span><strong>{publishedToday.length}</strong><small>{today}</small></article>
        <article><span>候选来源</span><strong>{rssReady ? '已配置' : '站内备用'}</strong><small>NEWS_RSS_FEEDS / NEWS_API_KEY</small></article>
        <article><span>最近任务</span><strong>{jobs.length}</strong><small>发布任务日志</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">环境变量</p>
          <h2>自动化配置状态</h2>
        </div>
        <dl className="admin-config-list">
          <div><dt>NEWS_DAILY_TARGET</dt><dd>{process.env.NEWS_DAILY_TARGET || '默认 4'}</dd></div>
          <div><dt>NEWS_LOOKBACK_HOURS</dt><dd>{process.env.NEWS_LOOKBACK_HOURS || '默认 72'}</dd></div>
          <div><dt>NEWS_DEDUP_DAYS</dt><dd>{process.env.NEWS_DEDUP_DAYS || '默认 7'}</dd></div>
          <div><dt>NEWS_RSS_FEEDS</dt><dd>{process.env.NEWS_RSS_FEEDS ? '已配置可信 RSS 来源' : '未配置，自动发布会安全暂停。'}</dd></div>
          <div><dt>NEWS_SOURCE_WHITELIST</dt><dd>{process.env.NEWS_SOURCE_WHITELIST ? '已配置来源白名单' : '沿用 RSS 域名白名单'}</dd></div>
          <div><dt>NEWS_AUTO_PUBLISH</dt><dd>{process.env.NEWS_AUTO_PUBLISH === 'false' ? '已关闭，候选仅记录待人工审核' : '已启用，符合全部规则后自动发布'}</dd></div>
        </dl>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">任务日志</p>
          <h2>发布任务</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>时间</th><th>类型</th><th>目标</th><th>已发布</th><th>本次发布</th><th>状态</th><th>说明</th></tr></thead>
            <tbody>
              {jobs.length ? jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.createdAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{job.type}</td>
                  <td>{job.target}</td>
                  <td>{job.alreadyPublishedToday}</td>
                  <td>{job.publishedCount}</td>
                  <td>{job.status}</td>
                  <td>{job.message}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无 News 自动化任务日志。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">来源审计</p>
          <h2>发布与去重记录</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>时间</th><th>结果</th><th>标题</th><th>来源</th><th>原始发布时间</th><th>产品关联</th><th>说明</th></tr></thead>
            <tbody>
              {audits.length ? audits.map((audit) => (
                <tr key={audit.id}>
                  <td>{audit.createdAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{audit.result}</td>
                  <td>{audit.title}<br /><small>{audit.slug}</small></td>
                  <td>{audit.sourceName}<br /><small>{audit.sourceUrl}</small></td>
                  <td>{audit.sourcePublishedAt.slice(0, 10)}</td>
                  <td>{audit.productSlugs.join(', ')}</td>
                  <td>{audit.reason}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无发布审计记录。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

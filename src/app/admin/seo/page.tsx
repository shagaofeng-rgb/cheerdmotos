import {redirect} from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import {requireAdminPageSession} from '@/lib/adminAuth';
import {GOOGLE_SITEMAP_PATHS, googleSeoConfigStatus, googleWeeklySchedule, readGoogleSeoRuns, readGoogleSeoSnapshot, runGoogleSeoMaintenance, syncGoogleSeoSnapshot, type GoogleSeoMetricRow} from '@/lib/googleSeo';
import {siteUrl} from '@/lib/site';

export const dynamic = 'force-dynamic';

async function syncGoogleSeoAction() {
  'use server';
  await requireAdminPageSession('seo');
  await syncGoogleSeoSnapshot();
  redirect('/admin/seo?synced=1');
}

async function submitGoogleSeoAction() {
  'use server';
  await requireAdminPageSession('seo');
  await runGoogleSeoMaintenance({trigger: 'manual', force: true, sitemapUrls: GOOGLE_SITEMAP_PATHS.map((path) => `${siteUrl}${path}`)});
  redirect('/admin/seo?submitted=1');
}

const shanghai = new Intl.DateTimeFormat('zh-CN', {dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Shanghai'});
function localTime(value?: string) {
  return value && Number.isFinite(Date.parse(value)) ? shanghai.format(new Date(value)) : '—';
}

function percent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function position(value: number) {
  return value ? value.toFixed(1) : '-';
}

function MetricTable({title, rows, keyLabel}: {title: string; rows: GoogleSeoMetricRow[]; keyLabel: string}) {
  return (
    <section className="admin-panel">
      <div>
        <p className="eyebrow">Google Search Console</p>
        <h2>{title}</h2>
      </div>
      <div className="admin-table-wrap">
        <table>
          <thead><tr><th>{keyLabel}</th><th>点击</th><th>展示</th><th>CTR</th><th>平均排名</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.key}><td>{row.key}</td><td>{row.clicks}</td><td>{row.impressions}</td><td>{percent(row.ctr)}</td><td>{position(row.position)}</td></tr>
            )) : <tr><td colSpan={5}>当前日期范围内暂无搜索表现数据。</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AdminSeoPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  await requireAdminPageSession('seo');
  const params = await searchParams;
  const [snapshot, config, runs] = await Promise.all([readGoogleSeoSnapshot(), googleSeoConfigStatus(), readGoogleSeoRuns(8)]);
  const sitemaps = snapshot.sitemaps || [];
  const inspections = snapshot.inspections || [];
  const confirmed = inspections.filter((entry) => entry.verdict === 'PASS').length;
  const completed = inspections.filter((entry) => !entry.error).length;

  return (
    <AdminShell active="seo">
      <div className="admin-title">
        <p className="eyebrow">Google SEO 数据</p>
        <h1>Search Console 搜索表现</h1>
        <p>同步真实的自然搜索、页面、关键词、国家、设备和 Sitemap 索引状态。</p>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">连接状态</p>
          <h2>{snapshot.status === 'ok' ? 'Google 数据已连接' : snapshot.status === 'not_configured' ? '等待配置 Google 凭据' : '同步需要处理'}</h2>
          <p>站点资源：{config.siteUrl}（{config.propertyType === 'domain' ? '域名属性' : '网址前缀属性'}）</p>
          <p>凭据状态：{config.configured ? `已配置（${config.credentialSource}）` : '未配置服务账号凭据'}</p>
          <p>数据范围：{snapshot.range.startDate} 至 {snapshot.range.endDate}</p>
          <p>最近成功读取搜索数据（北京时间） {localTime(snapshot.syncedAt)}</p>
          <p>最近成功读取 Sitemap 状态 {localTime(snapshot.sitemapsSyncedAt)} · 最近尝试 {localTime(snapshot.attemptedAt)}</p>
          {params.synced === '1' ? <p>已完成一次手动同步，请查看下方结果。</p> : null}
          {snapshot.error ? <p>提示：{snapshot.error}</p> : null}
          {params.submitted === '1' && <p role="status">手动任务已结束。请查看下方提交回执。</p>}
        </div>
        <form action={syncGoogleSeoAction} className="admin-actions">
          <button className="button secondary small" type="submit" disabled={!config.configured}>读取 Google 数据</button>
        </form>
        <form action={submitGoogleSeoAction} className="admin-actions">
          <button className="button primary small" type="submit" disabled={!config.configured}>主动提交 Sitemap 并核验</button>
        </form>
      </section>

      <section className="admin-panel">
        <div><p className="eyebrow">主动提交记录</p><h2>Google Sitemap 提交与握手</h2><p>每周一北京时间 09:00 执行。下次计划 {localTime(googleWeeklySchedule().next)}。Google 接收提交后会独立安排读取和索引。</p></div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>执行时间</th><th>触发方式</th><th>是否到期</th><th>提交结果</th><th>下次可提交</th><th>说明</th></tr></thead>
            <tbody>
              {runs.length ? runs.map((run) => (
                <tr key={run.id}><td>{localTime(run.finishedAt)}</td><td>{run.trigger === 'manual' ? '手动' : '定时任务'}</td><td>{run.due ? '是' : '否'}</td><td>{run.submitted ? 'Google 已接收' : run.error ? '失败' : '本周期已提交'}</td><td>{localTime(run.nextDueAt)}</td><td>{run.error || run.results.map((item) => new URL(item.sitemapUrl).pathname).join('、') || '—'}</td></tr>
              )) : <tr><td colSpan={6}>尚无主动提交记录；首次生产任务执行后会在这里保留结果。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="admin-metrics">
        <article><span>点击</span><strong>{snapshot.syncedAt ? snapshot.totals.clicks : '—'}</strong><small>Google 自然搜索</small></article>
        <article><span>展示</span><strong>{snapshot.syncedAt ? snapshot.totals.impressions : '—'}</strong><small>搜索结果展示次数</small></article>
        <article><span>Google 读取的地图</span><strong>{sitemaps.filter((item) => item.lastDownloaded).length}/{sitemaps.length || '—'}</strong><small>仅统计已返回的文件记录</small></article>
        <article><span>已索引的抽查网址</span><strong>{completed ? `${confirmed}/${completed}` : '—'}</strong><small>按 URL 检查结果统计</small></article>
      </div>

      <section className="admin-panel">
        <div><p className="eyebrow">Sitemap 状态</p><h2>Google 读取与处理结果</h2></div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Sitemap</th><th>文件条目</th><th>最近提交</th><th>最近读取</th><th>处理状态</th></tr></thead>
            <tbody>
              {sitemaps.length ? sitemaps.map((item) => (
                <tr key={item.path}><td>{item.path}</td><td>{item.submitted}</td><td>{localTime(item.lastSubmitted)}</td><td>{localTime(item.lastDownloaded)}</td><td>{item.pending ? '等待处理' : `${item.errors} 错误 / ${item.warnings} 警告`}</td></tr>
              )) : <tr><td colSpan={5}>尚未同步 Sitemap 状态。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <div><h2>重点网址实际索引</h2><p>通过 Google URL 检查读取已知索引状态。查看结果时间、最近抓取和 Google 选择的网址。</p></div>
        <div className="admin-table-wrap"><table><thead><tr><th>网址</th><th>索引结果</th><th>最近抓取</th><th>Google 规范网址</th><th>检查时间</th></tr></thead><tbody>
          {inspections.map((item) => <tr key={item.url}><td>{item.url}</td><td>{item.error || item.coverage || item.verdict || '待确认'}</td><td>{localTime(item.crawledAt)}</td><td>{item.googleCanonical || '—'}</td><td>{localTime(item.inspectedAt)}</td></tr>)}
          {!inspections.length && <tr><td colSpan={5}>等待首次 Google URL 检查。</td></tr>}
        </tbody></table></div>
      </section>

      {!config.configured ? (
        <section className="admin-panel"><div><p className="eyebrow">需要配置</p><h2>连接 Google Search Console 服务账号</h2><p>请在 Vercel 配置 Search Console 服务账号凭据，并为对应站点资源授予访问权限。</p></div></section>
      ) : null}

      <MetricTable title="搜索页面表现" keyLabel="页面" rows={snapshot.pages} />
      <MetricTable title="搜索关键词表现" keyLabel="关键词" rows={snapshot.queries} />
      <MetricTable title="国家/地区表现" keyLabel="国家/地区" rows={snapshot.countries} />
      <MetricTable title="设备表现" keyLabel="设备" rows={snapshot.devices} />
    </AdminShell>
  );
}

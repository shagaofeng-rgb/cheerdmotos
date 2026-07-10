import {redirect} from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import {requireAdminSession} from '@/lib/adminAuth';
import {googleSeoConfigStatus, readGoogleSeoSnapshot, syncGoogleSeoSnapshot, type GoogleSeoMetricRow} from '@/lib/googleSeo';

export const dynamic = 'force-dynamic';

async function syncGoogleSeoAction() {
  'use server';
  await requireAdminSession();
  await syncGoogleSeoSnapshot();
  redirect('/admin/seo?synced=1');
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
  const params = await searchParams;
  const [snapshot, config] = await Promise.all([readGoogleSeoSnapshot(), googleSeoConfigStatus()]);
  const sitemaps = snapshot.sitemaps || [];
  const submitted = sitemaps.reduce((total, item) => total + item.submitted, 0);
  const indexed = sitemaps.reduce((total, item) => total + item.indexed, 0);
  const sitemapErrors = sitemaps.reduce((total, item) => total + item.errors + item.warnings, 0);

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
          <p>站点资源：{config.siteUrl}</p>
          <p>凭据状态：{config.configured ? `已配置（${config.credentialSource}）` : '未配置服务账号凭据'}</p>
          <p>数据范围：{snapshot.range.startDate} 至 {snapshot.range.endDate}</p>
          <p>最近同步：{snapshot.syncedAt ? snapshot.syncedAt.slice(0, 19).replace('T', ' ') : '-'}</p>
          {params.synced === '1' ? <p>已完成一次手动同步，请查看下方结果。</p> : null}
          {snapshot.error ? <p>提示：{snapshot.error}</p> : null}
        </div>
        <form action={syncGoogleSeoAction} className="admin-actions">
          <button className="button primary small" type="submit">立即同步 Google 数据</button>
        </form>
      </section>

      <div className="admin-metrics">
        <article><span>点击</span><strong>{snapshot.totals.clicks}</strong><small>Google 自然搜索</small></article>
        <article><span>展示</span><strong>{snapshot.totals.impressions}</strong><small>搜索结果展示次数</small></article>
        <article><span>Sitemap 已提交</span><strong>{submitted}</strong><small>Google 接收的公开 URL</small></article>
        <article><span>Sitemap 已索引</span><strong>{indexed}</strong><small>{sitemapErrors ? `${sitemapErrors} 个警告或错误` : 'Sitemap 无警告和错误'}</small></article>
      </div>

      <section className="admin-panel">
        <div><p className="eyebrow">Sitemap 状态</p><h2>Google 抓取与索引进度</h2></div>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Sitemap</th><th>已提交</th><th>已索引</th><th>错误/警告</th><th>最近下载</th></tr></thead>
            <tbody>
              {sitemaps.length ? sitemaps.map((item) => (
                <tr key={item.path}><td>{item.path}</td><td>{item.submitted}</td><td>{item.indexed}</td><td>{item.errors}/{item.warnings}</td><td>{item.lastDownloaded ? item.lastDownloaded.slice(0, 19).replace('T', ' ') : '-'}</td></tr>
              )) : <tr><td colSpan={5}>尚未同步 Sitemap 状态。</td></tr>}
            </tbody>
          </table>
        </div>
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

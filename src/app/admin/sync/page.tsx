import AdminShell from '@/components/AdminShell';
import {durableStoreStatus} from '@/lib/durableStore';
import {googleSeoConfigStatus, readGoogleSeoSnapshot} from '@/lib/googleSeo';
import {readSitemapLogs} from '@/lib/sitemapManager';

export const dynamic = 'force-dynamic';

export default async function AdminSyncPage() {
  const [storage, seoConfig, seoSnapshot, sitemapLogs] = await Promise.all([
    Promise.resolve(durableStoreStatus()),
    Promise.resolve(googleSeoConfigStatus()),
    readGoogleSeoSnapshot(),
    readSitemapLogs(8)
  ]);
  const latestSitemap = sitemapLogs[0];

  return (
    <AdminShell active="sync">
      <div className="admin-title">
        <p className="eyebrow">数据同步</p>
        <h1>数据同步与站点索引</h1>
        <p>检查持久化存储、Google Search Console、Sitemap、定时发布和后台数据同步任务是否就绪。</p>
      </div>

      <div className="admin-metrics">
        <article><span>存储</span><strong>{storage.configured ? '已配置' : '待配置'}</strong><small>{storage.provider}</small></article>
        <article><span>GSC</span><strong>{seoConfig.configured ? '已绑定' : '待绑定'}</strong><small>{seoConfig.siteUrl || '未配置站点'}</small></article>
        <article><span>SEO 快照</span><strong>{(seoSnapshot.pages.length + seoSnapshot.queries.length).toLocaleString()}</strong><small>页面与关键词行数</small></article>
        <article><span>Sitemap URL</span><strong>{latestSitemap ? latestSitemap.urlCount : 0}</strong><small>{latestSitemap ? latestSitemap.finishedAt.slice(0, 10) : '待生成'}</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">同步状态</p>
          <h2>外部服务与定时任务</h2>
        </div>
        <dl className="admin-config-list">
          <div><dt>持久化存储</dt><dd>{storage.configured ? `${storage.provider} 已启用，订单、表单、后台内容和日志可跨部署保存。` : '未检测到稳定存储配置，上线经营前必须配置 Vercel Blob/KV/数据库。'}</dd></div>
          <div><dt>Google Search Console</dt><dd>{seoConfig.configured ? `站点 ${seoConfig.siteUrl} 已配置，凭据来源：${seoConfig.credentialSource}。` : '缺少 Google Search Console 服务账号凭据或站点配置。'}</dd></div>
          <div><dt>Sitemap 地址</dt><dd>https://www.cheerdmotos.com/sitemap.xml</dd></div>
          <div><dt>定时任务</dt><dd>/api/cron/publish-news、/api/cron/publish-blog、/api/cron/sync-google-seo、/api/cron/sitemap、/api/cron/test-contact-form 已写入 vercel.json。</dd></div>
          <div><dt>最近 SEO 同步</dt><dd>{seoSnapshot?.syncedAt ? seoSnapshot.syncedAt : '暂无同步时间'}</dd></div>
        </dl>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">Sitemap</p>
          <h2>Sitemap 执行日志</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>时间</th><th>触发方式</th><th>URL 数</th><th>文件</th><th>Google 提交</th><th>错误</th></tr>
            </thead>
            <tbody>
              {sitemapLogs.length ? sitemapLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.finishedAt.slice(0, 19).replace('T', ' ')}</td>
                  <td>{log.trigger}</td>
                  <td>{log.urlCount}</td>
                  <td>{log.files.join(', ')}</td>
                  <td>{log.googleSubmitted ? '已提交' : log.googleResult}</td>
                  <td>{log.errorCount ? log.errors.join('; ') : '0'}</td>
                </tr>
              )) : <tr><td colSpan={6}>暂无 Sitemap 执行日志。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

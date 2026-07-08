import AdminShell from '@/components/AdminShell';
import {durableStoreStatus} from '@/lib/durableStore';
import {googleSeoConfigStatus, readGoogleSeoSnapshot} from '@/lib/googleSeo';

export const dynamic = 'force-dynamic';

export default async function AdminSyncPage() {
  const [storage, seoConfig, seoSnapshot] = await Promise.all([
    Promise.resolve(durableStoreStatus()),
    Promise.resolve(googleSeoConfigStatus()),
    readGoogleSeoSnapshot()
  ]);

  return (
    <AdminShell active="sync">
      <div className="admin-title">
        <p className="eyebrow">数据同步</p>
        <h1>数据同步</h1>
        <p>检查后台持久化存储、Google Search Console、定时发布和 SEO 同步任务是否就绪。</p>
      </div>

      <div className="admin-metrics">
        <article><span>存储</span><strong>{storage.configured ? '已配置' : '待配置'}</strong><small>{storage.provider}</small></article>
        <article><span>GSC</span><strong>{seoConfig.configured ? '已绑定' : '待绑定'}</strong><small>{seoConfig.siteUrl || '未配置站点'}</small></article>
        <article><span>SEO 快照</span><strong>{(seoSnapshot.pages.length + seoSnapshot.queries.length).toLocaleString()}</strong><small>页面与关键词行数</small></article>
        <article><span>Cron 任务</span><strong>4</strong><small>新闻、博客、SEO、表单测试</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">同步状态</p>
          <h2>外部服务与定时任务</h2>
        </div>
        <dl className="admin-config-list">
          <div><dt>持久化存储</dt><dd>{storage.configured ? `${storage.provider} 已启用，订单和后台数据可跨部署保存。` : '未检测到稳定存储配置，上线经营前必须配置 Vercel Blob/KV/数据库。'}</dd></div>
          <div><dt>Google Search Console</dt><dd>{seoConfig.configured ? `站点 ${seoConfig.siteUrl} 已配置，凭据来源：${seoConfig.credentialSource}。` : '缺少 Google Search Console 服务账号凭据或站点配置。'}</dd></div>
          <div><dt>定时发布</dt><dd>/api/cron/publish-news、/api/cron/publish-blog、/api/cron/sync-google-seo、/api/cron/test-contact-form 已写入 vercel.json。</dd></div>
          <div><dt>最近 SEO 同步</dt><dd>{seoSnapshot?.syncedAt ? seoSnapshot.syncedAt : '暂无同步时间'}</dd></div>
        </dl>
      </section>
    </AdminShell>
  );
}

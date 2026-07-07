import AdminShell from '@/components/AdminShell';
import {listAdminMedia} from '@/lib/backendStore';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const media = await listAdminMedia();
  return (
    <AdminShell active="媒体库">
      <div className="admin-title">
        <p className="eyebrow">图片与素材</p>
        <h1>媒体库</h1>
        <p>这里管理图片路径、ALT 文案和素材使用位置。真实上传到云存储的接口后续接入。</p>
      </div>
      <section className="admin-panel">
        <div>
          <p className="eyebrow">登记素材</p>
          <h2>添加已有图片</h2>
        </div>
        <form className="admin-form-grid" action="/api/admin/media" method="post">
          <input name="url" placeholder="/homepage-assets/cheerdmoto_style_a_rally_terrain/assets/products/xceed_transparent.png" required />
          <input name="alt" placeholder="图片 ALT 描述" required />
          <input name="usage" placeholder="使用位置，例如产品/新闻" />
          <button type="submit">加入媒体库</button>
        </form>
      </section>
      <section className="admin-panel">
        <div className="admin-media-grid">
          {media.length ? media.map((asset) => (
            <article key={asset.id}>
              <img src={asset.url} alt={asset.alt} />
              <strong>{asset.alt}</strong>
              <small>{asset.url}</small>
              <span>{asset.usage.join(', ') || '未绑定使用位置'}</span>
            </article>
          )) : <article><strong>暂无媒体数据</strong><small>请先添加已有图片路径或接入上传接口。</small></article>}
        </div>
      </section>
    </AdminShell>
  );
}

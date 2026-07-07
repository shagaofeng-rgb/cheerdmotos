import AdminShell from '@/components/AdminShell';
import {zhPublishStatus} from '@/lib/adminZh';
import {listAdminCategories} from '@/lib/backendStore';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  return (
    <AdminShell active="分类管理">
      <div className="admin-title">
        <p className="eyebrow">产品分类</p>
        <h1>分类管理</h1>
        <p>管理产品线、分类 SEO、前台筛选顺序和分类状态。</p>
      </div>
      <section className="admin-panel">
        <div>
          <p className="eyebrow">快速新增</p>
          <h2>新增分类</h2>
        </div>
        <form className="admin-form-grid" action="/api/admin/categories" method="post">
          <input name="name" placeholder="分类名称" required />
          <input name="slug" placeholder="分类链接 slug" required />
          <input name="coverImage" placeholder="https://cdn.shopify.com/s/files/1/0891/6231/8139/files/2.0-6.jpg?v=1739866508&width=1200" />
          <input name="seoTitle" placeholder="SEO 标题" />
          <button type="submit">保存分类</button>
        </form>
      </section>
      <section className="admin-panel">
        <div className="admin-grid-list">
          {categories.length ? categories.map((category) => (
            <article key={category.id}>
              <strong>{category.name}</strong>
              <span>{category.slug} | {zhPublishStatus(category.status)}</span>
              <small>{category.description}</small>
            </article>
          )) : <article><strong>暂无分类数据</strong><span>请先新增分类</span></article>}
        </div>
      </section>
    </AdminShell>
  );
}

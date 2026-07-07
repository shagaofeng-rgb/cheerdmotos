import AdminShell from '@/components/AdminShell';
import {zhPublishStatus} from '@/lib/adminZh';
import {listAdminPosts} from '@/lib/backendStore';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  const posts = await listAdminPosts('blog');
  return (
    <AdminShell active="blog">
      <div className="admin-title">
        <p className="eyebrow">SEO / AIO Content</p>
        <h1>博客管理</h1>
        <p>发布产品知识、应用方案、对比分析和采购决策内容，用于 Google SEO / GEO / AIO 获客。</p>
      </div>
      <section className="admin-panel">
        <div>
          <p className="eyebrow">新增内容</p>
          <h2>新增博客</h2>
        </div>
        <form className="admin-form-grid admin-form-wide" action="/api/admin/posts" method="post">
          <input type="hidden" name="type" value="blog" />
          <input name="title" placeholder="博客标题" required />
          <input name="slug" placeholder="博客链接 slug" required />
          <select name="status" defaultValue="draft">
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="unpublished">已下架</option>
            <option value="scheduled">定时发布</option>
            <option value="archived">已归档</option>
          </select>
          <input name="publishDate" type="date" />
          <input name="category" placeholder="分类，例如 Buying Guide / Product Knowledge" />
          <input name="author" placeholder="作者，例如 CHEERDMOTO Editorial Team" />
          <input name="source" placeholder="来源名称 / URL" />
          <input name="coverImage" placeholder="/assets/news/example.webp" />
          <input name="tags" placeholder="标签，用英文逗号分隔" />
          <textarea name="excerpt" placeholder="SEO 摘要" />
          <textarea name="content" placeholder="博客正文，可用 Markdown 编写 H2/H3、FAQ、CTA 等内容" />
          <input name="seoTitle" placeholder="SEO Title" />
          <textarea name="seoDescription" placeholder="Meta Description" />
          <button type="submit">保存博客</button>
        </form>
      </section>
      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>标题</th><th>日期</th><th>标签</th><th>状态</th><th>SEO 描述</th></tr></thead>
            <tbody>
              {posts.length ? posts.map((post) => (
                <tr key={post.id}>
                  <td><strong>{post.title}</strong><br /><small>{post.slug}</small></td>
                  <td>{post.publishDate}</td>
                  <td>{post.tags.join(', ') || '-'}</td>
                  <td><span className={`admin-status ${post.status}`}>{zhPublishStatus(post.status)}</span></td>
                  <td>{post.seoDescription || '-'}</td>
                </tr>
              )) : <tr><td colSpan={5}>暂无博客数据。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

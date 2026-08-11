import AdminShell from '@/components/AdminShell';
import {zhPublishStatus} from '@/lib/adminZh';
import {listAdminPosts, type ContentPost} from '@/lib/backendStore';

export const dynamic = 'force-dynamic';

const statuses = [
  ['draft', '草稿'], ['published', '已发布'], ['scheduled', '定时发布'], ['unpublished', '已下线'], ['archived', '已归档']
] as const;

function BlogFields({post}: {post?: ContentPost}) {
  return <>
    <input type="hidden" name="type" value="blog" />
    <input type="hidden" name="intent" value={post ? 'update' : 'create'} />
    {post ? <input type="hidden" name="id" value={post.id} /> : null}
    <input name="title" defaultValue={post?.title} placeholder="博客标题" required />
    <input name="slug" defaultValue={post?.slug} placeholder="链接 slug，例如 electric-bike-buying-guide" required />
    <select name="status" defaultValue={post?.status || 'draft'}>{statuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
    <input name="publishDate" type="date" defaultValue={post?.publishDate} required />
    <input name="category" defaultValue={post?.category} placeholder="分类，例如 Buying Guide" />
    <input name="author" defaultValue={post?.author} placeholder="作者" />
    <input name="source" defaultValue={post?.source} placeholder="来源名称或 URL" />
    <input name="coverImage" defaultValue={post?.coverImage} placeholder="封面图片地址" />
    <input name="tags" defaultValue={post?.tags.join(', ')} placeholder="标签，英文逗号分隔" />
    <textarea name="excerpt" defaultValue={post?.excerpt} placeholder="摘要，用于列表和 SEO" />
    <textarea name="content" defaultValue={post?.content} placeholder="正文，支持 Markdown" required />
    <input name="seoTitle" defaultValue={post?.seoTitle} placeholder="SEO Title" />
    <textarea name="seoDescription" defaultValue={post?.seoDescription} placeholder="Meta Description" />
  </>;
}

export default async function AdminBlogPage({searchParams}: {searchParams: Promise<{error?: string}>}) {
  const [posts, params] = await Promise.all([listAdminPosts('blog'), searchParams]);
  return <AdminShell active="blog">
    <div className="admin-title">
      <p className="eyebrow">SEO / 内容运营</p>
      <h1>博客管理</h1>
      <p>管理真实持久化博客数据。草稿、发布、定时发布、下线和归档均会同步影响前台与 sitemap。</p>
    </div>
    {params.error ? <p className="admin-form-error" role="alert">{params.error}</p> : null}
    <section className="admin-panel">
      <div><p className="eyebrow">新建内容</p><h2>创建博客</h2></div>
      <form className="admin-form-grid admin-form-wide" action="/api/admin/posts" method="post"><BlogFields /><button type="submit">保存博客</button></form>
    </section>
    <section className="admin-panel">
      <div><p className="eyebrow">内容库</p><h2>{posts.length} 篇博客</h2></div>
      <div className="admin-content-list">
        {posts.map((post) => <details key={post.id} className="admin-content-item">
          <summary><span><strong>{post.title}</strong><small>{post.slug} · {post.publishDate}</small></span><span className={`admin-status ${post.status}`}>{zhPublishStatus(post.status)}</span></summary>
          <form className="admin-form-grid admin-form-wide" action="/api/admin/posts" method="post"><BlogFields post={post} /><button type="submit">保存修改</button></form>
          <form action="/api/admin/posts" method="post" className="admin-inline-form">
            <input type="hidden" name="type" value="blog" /><input type="hidden" name="intent" value="archive" /><input type="hidden" name="id" value={post.id} />
            <button type="submit" className="admin-danger-button">归档文章</button>
          </form>
        </details>)}
        {!posts.length ? <p>暂无博客数据。</p> : null}
      </div>
    </section>
  </AdminShell>;
}

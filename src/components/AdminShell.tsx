import {requireAdminSession} from '@/lib/adminAuth';
import AdminRealtimeSync from '@/components/AdminRealtimeSync';

const navGroups = [
  {
    title: '经营看板',
    items: [
      {key: 'dashboard', label: '数据总览', href: '/admin'},
      {key: 'orders', label: '订单管理', href: '/admin/orders'},
      {key: 'customers', label: '客户管理', href: '/admin/customers'},
      {key: 'leads', label: '线索管理', href: '/admin/leads'}
    ]
  },
  {
    title: '商品内容',
    items: [
      {key: 'products', label: '产品管理', href: '/admin/products'},
      {key: 'categories', label: '分类管理', href: '/admin/categories'},
      {key: 'media', label: '媒体库', href: '/admin/media'},
      {key: 'blog', label: '博客内容', href: '/admin/blog'},
      {key: 'news', label: '新闻内容', href: '/admin/news'}
    ]
  },
  {
    title: '增长分析',
    items: [
      {key: 'analytics', label: '访问统计', href: '/admin/analytics'},
      {key: 'visitors', label: '访客记录', href: '/admin/visitors'},
      {key: 'acquisition', label: '来源归因', href: '/admin/analytics/acquisition'},
      {key: 'funnel', label: '转化漏斗', href: '/admin/funnel'},
      {key: 'seo', label: 'SEO 数据', href: '/admin/seo'}
    ]
  },
  {
    title: '系统',
    items: [
      {key: 'settings', label: '系统设置', href: '/admin/settings'}
    ]
  }
] as const;

export default async function AdminShell({active, children}: {active: string; children: React.ReactNode}) {
  const session = await requireAdminSession();

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <a className="admin-logo" href="/admin">
          <span>CM</span>
          <strong>CHEERDMOTO 后台</strong>
        </a>
        <nav>
          {navGroups.map((group) => (
            <div className="admin-nav-group" key={group.title}>
              <p>{group.title}</p>
              {group.items.map((item) => (
                <a
                  className={active === item.key || active === item.label || active === item.href ? 'is-active' : ''}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <small>当前账号</small>
          <span>{session.email}</span>
          <form action="/api/admin/logout" method="post">
            <button type="submit">退出登录</button>
          </form>
        </div>
      </aside>
      <section className="admin-main">
        <AdminRealtimeSync />
        {children}
      </section>
    </main>
  );
}

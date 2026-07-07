import {requireAdminSession} from '@/lib/adminAuth';
import AdminRealtimeSync from '@/components/AdminRealtimeSync';

const navItems = [
  {key: 'dashboard', label: '数据总览', href: '/admin'},
  {key: 'products', label: '产品管理', href: '/admin/products'},
  {key: 'categories', label: '分类管理', href: '/admin/categories'},
  {key: 'media', label: '媒体库', href: '/admin/media'},
  {key: 'blog', label: '博客管理', href: '/admin/blog'},
  {key: 'news', label: '新闻管理', href: '/admin/news'},
  {key: 'orders', label: '订单管理', href: '/admin/orders'},
  {key: 'customers', label: '客户管理', href: '/admin/customers'},
  {key: 'leads', label: '线索/弃单', href: '/admin/leads'},
  {key: 'analytics', label: '访问统计', href: '/admin/analytics'},
  {key: 'seo', label: 'SEO 数据', href: '/admin/seo'},
  {key: 'visitors', label: '访客记录', href: '/admin/visitors'},
  {key: 'acquisition', label: '来源归因', href: '/admin/analytics/acquisition'},
  {key: 'funnel', label: '转化漏斗', href: '/admin/funnel'},
  {key: 'settings', label: '系统设置', href: '/admin/settings'}
] as const;

export default async function AdminShell({active, children}: {active: string; children: React.ReactNode}) {
  const session = await requireAdminSession();
  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <a className="admin-logo" href="/admin">
          <span>CM</span>
          <strong>在海后台管理</strong>
        </a>
        <nav>
          {navItems.map((item) => (
            <a className={active === item.key || active === item.label || active === item.href ? 'is-active' : ''} href={item.href} key={item.href}>
              {item.label}
            </a>
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

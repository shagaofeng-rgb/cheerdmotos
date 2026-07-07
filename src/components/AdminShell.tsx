import {requireAdminSession} from '@/lib/adminAuth';
import AdminRealtimeSync from '@/components/AdminRealtimeSync';

const navItems = [
  {key: 'dashboard', label: 'Dashboard', href: '/admin'},
  {key: 'products', label: 'Products', href: '/admin/products'},
  {key: 'categories', label: 'Categories', href: '/admin/categories'},
  {key: 'media', label: 'Media', href: '/admin/media'},
  {key: 'blog', label: 'Blog', href: '/admin/blog'},
  {key: 'news', label: 'News', href: '/admin/news'},
  {key: 'orders', label: 'Orders', href: '/admin/orders'},
  {key: 'customers', label: 'Customers', href: '/admin/customers'},
  {key: 'leads', label: 'Leads', href: '/admin/leads'},
  {key: 'analytics', label: 'Analytics', href: '/admin/analytics'},
  {key: 'seo', label: 'SEO', href: '/admin/seo'},
  {key: 'visitors', label: 'Visitors', href: '/admin/visitors'},
  {key: 'acquisition', label: 'Acquisition', href: '/admin/analytics/acquisition'},
  {key: 'funnel', label: 'Funnel', href: '/admin/funnel'},
  {key: 'settings', label: 'Settings', href: '/admin/settings'}
] as const;

export default async function AdminShell({active, children}: {active: string; children: React.ReactNode}) {
  const session = await requireAdminSession();
  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <a className="admin-logo" href="/admin">
          <span>CM</span>
          <strong>CHEERDMOTO Admin</strong>
        </a>
        <nav>
          {navItems.map((item) => (
            <a className={active === item.key || active === item.label || active === item.href ? 'is-active' : ''} href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <small>Current account</small>
          <span>{session.email}</span>
          <form action="/api/admin/logout" method="post">
            <button type="submit">Log out</button>
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

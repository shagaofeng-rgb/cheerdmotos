import {requireAdminSession} from '@/lib/adminAuth';
import AdminRealtimeSync from '@/components/AdminRealtimeSync';

const navGroups = [
  {
    title: '经营看板',
    items: [
      {key: 'dashboard', label: '数据概览', href: '/admin'},
      {key: 'sales', label: '销售分析', href: '/admin/sales'},
      {key: 'orders', label: '订单管理', href: '/admin/orders'},
      {key: 'payments', label: '支付与退款', href: '/admin/payments'},
      {key: 'fulfillment', label: '发货与物流', href: '/admin/fulfillment'},
      {key: 'returns', label: '退换货管理', href: '/admin/returns'},
      {key: 'carts', label: '购物车与弃购', href: '/admin/carts'}
    ]
  },
  {
    title: '商品内容',
    items: [
      {key: 'products', label: '商品管理', href: '/admin/products'},
      {key: 'categories', label: '商品分类', href: '/admin/categories'},
      {key: 'product-attributes', label: '商品属性与规格', href: '/admin/product-attributes'},
      {key: 'inventory', label: '库存管理', href: '/admin/inventory'},
      {key: 'promotions', label: '优惠与促销', href: '/admin/promotions'},
      {key: 'reviews', label: '评价管理', href: '/admin/reviews'},
      {key: 'media', label: '媒体库', href: '/admin/media'},
      {key: 'blog', label: '博客内容', href: '/admin/blog'},
      {key: 'news', label: '新闻内容', href: '/admin/news'}
    ]
  },
  {
    title: '客户增长',
    items: [
      {key: 'customers', label: '客户管理', href: '/admin/customers'},
      {key: 'customer-groups', label: '客户分组', href: '/admin/customer-groups'},
      {key: 'leads', label: '线索管理', href: '/admin/leads'},
      {key: 'forms', label: '客户表单', href: '/admin/forms'},
      {key: 'analytics', label: '访问分析', href: '/admin/analytics'},
      {key: 'visitors', label: '访客记录', href: '/admin/visitors'},
      {key: 'acquisition', label: '来源归因', href: '/admin/analytics/acquisition'},
      {key: 'funnel', label: '转化漏斗', href: '/admin/funnel'},
      {key: 'seo', label: 'SEO 数据', href: '/admin/seo'}
    ]
  },
  {
    title: '系统治理',
    items: [
      {key: 'sync', label: '数据同步', href: '/admin/sync'},
      {key: 'users', label: '用户与权限', href: '/admin/users'},
      {key: 'audit-logs', label: '操作日志', href: '/admin/audit-logs'},
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
        <nav aria-label="后台导航">
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

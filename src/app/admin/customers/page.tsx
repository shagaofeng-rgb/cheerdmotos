import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {zhLeadStatus} from '@/lib/adminZh';
import {buildCustomerLeads} from '@/lib/backendStore';
import {readAnalyticsEvents, readStoreOrders} from '@/lib/commerceStore';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const [orders, events] = await Promise.all([readStoreOrders(), readAnalyticsEvents()]);
  const inRange = (value: string) => { const time = new Date(value).getTime(); return time >= timeFilter.from.getTime() && time <= timeFilter.to.getTime(); };
  const customers = buildCustomerLeads(orders.filter((order) => inRange(order.createdAt)), events.filter((event) => inRange(event.timestamp))).filter((lead) => lead.email || lead.phone);
  const pagedCustomers = paginate(customers, page, perPage);

  return (
    <AdminShell active="customers">
      <div className="admin-title">
        <p className="eyebrow">CRM</p>
        <h1>客户管理</h1>
        <p>这里显示客户真实提交结账或询盘后留下联系方式的数据。</p>
        <AdminTimeFilter action="/admin/customers" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="客户活跃时间" summary={timeFilter.summary} />
      </div>
      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>客户</th><th>联系方式</th><th>公司</th><th>国家/地区</th><th>关注产品</th><th>状态</th><th>最后活跃</th></tr></thead>
            <tbody>
              {pagedCustomers.items.length ? pagedCustomers.items.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong><br /><small>{customer.source}</small></td>
                  <td>{customer.email}<br /><small>{customer.phone}</small></td>
                  <td>{customer.company || '-'}</td>
                  <td>{customer.country || '-'}</td>
                  <td>{customer.interestedProducts.join(', ') || '-'}</td>
                  <td><span className="admin-status published">{zhLeadStatus(customer.status)}</span></td>
                  <td>{customer.lastActiveTime.slice(0, 10)}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无真实客户数据。客户提交结账或询盘后会出现在这里。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/customers" params={params} page={pagedCustomers.page} perPage={pagedCustomers.perPage} total={pagedCustomers.total} totalPages={pagedCustomers.totalPages} />
      </section>
    </AdminShell>
  );
}

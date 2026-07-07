import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {zhLeadStatus} from '@/lib/adminZh';
import {buildCustomerLeads} from '@/lib/backendStore';
import {readAnalyticsEvents, readStoreOrders} from '@/lib/commerceStore';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const {page, perPage} = parseAdminPagination(params);
  const [orders, events] = await Promise.all([readStoreOrders(), readAnalyticsEvents()]);
  const leads = buildCustomerLeads(orders, events);
  const pagedLeads = paginate(leads, page, perPage);

  return (
    <AdminShell active="leads">
      <div className="admin-title">
        <p className="eyebrow">线索与弃单</p>
        <h1>线索/弃单</h1>
        <p>跟踪真实结账开始、按钮点击、订单创建和待付款客户信号。</p>
      </div>
      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>线索</th><th>状态</th><th>关注产品</th><th>来源页面</th><th>流量来源</th><th>备注</th><th>最后活跃</th></tr></thead>
            <tbody>
              {pagedLeads.items.length ? pagedLeads.items.map((lead) => (
                <tr key={lead.id}>
                  <td><strong>{lead.name}</strong><br /><small>{lead.email || lead.id}</small></td>
                  <td><span className="admin-status draft">{zhLeadStatus(lead.status)}</span></td>
                  <td>{lead.interestedProducts.join(', ') || '-'}</td>
                  <td>{lead.source}</td>
                  <td>{lead.trafficSource}</td>
                  <td>{lead.notes}</td>
                  <td>{lead.lastActiveTime.slice(0, 10)}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无真实线索/弃单数据。前台访问、点击或结账后会实时记录。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/leads" params={params} page={pagedLeads.page} perPage={pagedLeads.perPage} total={pagedLeads.total} totalPages={pagedLeads.totalPages} />
      </section>
    </AdminShell>
  );
}

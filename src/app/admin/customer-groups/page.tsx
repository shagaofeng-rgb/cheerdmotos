import AdminShell from '@/components/AdminShell';
import {buildCustomerLeads} from '@/lib/backendStore';
import {readAnalyticsEvents, readStoreOrders} from '@/lib/commerceStore';

export const dynamic = 'force-dynamic';

function countBy(values: string[]) {
  const map = new Map<string, number>();
  values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()].map(([label, value]) => ({label, value})).sort((a, b) => b.value - a.value);
}

export default async function AdminCustomerGroupsPage() {
  const [orders, events] = await Promise.all([readStoreOrders(), readAnalyticsEvents()]);
  const leads = buildCustomerLeads(orders, events);
  const byCountry = countBy(leads.map((lead) => lead.country || '未知地区'));
  const byStatus = countBy(leads.map((lead) => lead.status));
  const bySource = countBy(leads.map((lead) => lead.trafficSource || 'direct'));

  return (
    <AdminShell active="customer-groups">
      <div className="admin-title">
        <p className="eyebrow">客户分组</p>
        <h1>客户分组</h1>
        <p>按国家地区、线索阶段和流量来源自动聚合客户，用于后续邮件营销、再营销和客服优先级分配。</p>
      </div>

      <div className="admin-metrics">
        <article><span>客户/线索</span><strong>{leads.length}</strong><small>订单与访问行为合并</small></article>
        <article><span>国家地区</span><strong>{byCountry.length}</strong><small>有明确地区的数据</small></article>
        <article><span>来源类型</span><strong>{bySource.length}</strong><small>SEO/广告/社媒/直接等</small></article>
        <article><span>已付款客户</span><strong>{leads.filter((lead) => lead.status === 'Paid').length}</strong><small>可进入复购分组</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">分组概览</p>
          <h2>自动分组结果</h2>
        </div>
        <div className="admin-three-col">
          <div className="admin-bar-list">{byCountry.length ? byCountry.map((row) => <p key={row.label}><span>{row.label}</span><strong>{row.value}</strong></p>) : <p><span>暂无地区数据</span><strong>0</strong></p>}</div>
          <div className="admin-bar-list">{byStatus.length ? byStatus.map((row) => <p key={row.label}><span>{row.label}</span><strong>{row.value}</strong></p>) : <p><span>暂无阶段数据</span><strong>0</strong></p>}</div>
          <div className="admin-bar-list">{bySource.length ? bySource.map((row) => <p key={row.label}><span>{row.label}</span><strong>{row.value}</strong></p>) : <p><span>暂无来源数据</span><strong>0</strong></p>}</div>
        </div>
      </section>
    </AdminShell>
  );
}

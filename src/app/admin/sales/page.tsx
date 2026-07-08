import AdminShell from '@/components/AdminShell';
import {getCommerceSnapshot, readStoreOrders} from '@/lib/commerceStore';
import {zhOrderStatus, zhPaymentStatus} from '@/lib/adminZh';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return `USD ${value.toLocaleString()}`;
}

export default async function AdminSalesPage() {
  const [snapshot, orders] = await Promise.all([getCommerceSnapshot(), readStoreOrders()]);
  const paidOrders = orders.filter((order) => ['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status));
  const units = paidOrders.reduce((sum, order) => sum + order.quantity, 0);
  const averageOrder = paidOrders.length ? snapshot.metrics.revenue / paidOrders.length : 0;

  return (
    <AdminShell active="sales">
      <div className="admin-title">
        <p className="eyebrow">销售分析</p>
        <h1>销售分析</h1>
        <p>从真实订单中统计销售额、件数、客单价、热销产品和国家地区需求，帮助判断当前销售质量。</p>
      </div>

      <div className="admin-metrics">
        <article><span>已确认销售额</span><strong>{money(snapshot.metrics.revenue)}</strong><small>已付款及履约中订单</small></article>
        <article><span>已付款订单</span><strong>{paidOrders.length}</strong><small>支付成功或已处理</small></article>
        <article><span>销售件数</span><strong>{units}</strong><small>订单商品数量合计</small></article>
        <article><span>平均客单价</span><strong>{money(Math.round(averageOrder))}</strong><small>销售额 / 已付款订单</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">热销与地区</p>
          <h2>需求分布</h2>
        </div>
        <div className="admin-two-col">
          <div className="admin-bar-list">
            {snapshot.productDemand.length ? snapshot.productDemand.map((row) => <p key={row.label}><span>{row.label}</span><strong>{row.value}</strong></p>) : <p><span>暂无产品销售数据</span><strong>0</strong></p>}
          </div>
          <div className="admin-bar-list">
            {snapshot.countries.length ? snapshot.countries.map((row) => <p key={row.label}><span>{row.label}</span><strong>{row.value}</strong></p>) : <p><span>暂无国家/地区数据</span><strong>0</strong></p>}
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">最近订单</p>
          <h2>销售记录</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>订单号</th><th>商品</th><th>客户</th><th>金额</th><th>订单状态</th><th>支付状态</th><th>日期</th></tr>
            </thead>
            <tbody>
              {snapshot.recentOrders.length ? snapshot.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.productName} x {order.quantity}</td>
                  <td>{order.customer.name}<br /><small>{order.customer.country}</small></td>
                  <td>{money(order.total)}</td>
                  <td>{zhOrderStatus(order.status)}</td>
                  <td>{zhPaymentStatus(order.gatewayStatus)}</td>
                  <td>{order.createdAt.slice(0, 10)}</td>
                </tr>
              )) : <tr><td colSpan={7}>暂无真实订单数据。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

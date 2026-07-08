import AdminShell from '@/components/AdminShell';
import {readRefundRecords, readStoreOrders} from '@/lib/commerceStore';
import {zhOrderStatus} from '@/lib/adminZh';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return `USD ${value.toLocaleString()}`;
}

export default async function AdminReturnsPage() {
  const [orders, refunds] = await Promise.all([readStoreOrders(), readRefundRecords()]);
  const returnedOrders = orders.filter((order) => order.shipmentStatus === 'returned' || ['refunded', 'partial_refunded'].includes(order.status));
  const pendingRefunds = refunds.filter((refund) => ['pending', 'submitted'].includes(refund.status));

  return (
    <AdminShell active="returns">
      <div className="admin-title">
        <p className="eyebrow">退换货管理</p>
        <h1>退换货管理</h1>
        <p>目前系统已接入退款记录和退回物流状态；独立退货申请表、质检结果和换货单需要在售后流程确认后继续接入。</p>
      </div>

      <div className="admin-metrics">
        <article><span>售后相关订单</span><strong>{returnedOrders.length}</strong><small>退款或退回状态</small></article>
        <article><span>待处理退款</span><strong>{pendingRefunds.length}</strong><small>pending/submitted</small></article>
        <article><span>退款总额</span><strong>{money(refunds.reduce((sum, refund) => sum + refund.amount, 0))}</strong><small>所有退款记录合计</small></article>
        <article><span>售后记录</span><strong>{refunds.length}</strong><small>退款流水</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">退款与退货</p>
          <h2>售后处理记录</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>记录号</th><th>订单号</th><th>金额</th><th>状态</th><th>原因</th><th>创建时间</th></tr>
            </thead>
            <tbody>
              {refunds.length ? refunds.slice().reverse().map((refund) => (
                <tr key={refund.id}>
                  <td>{refund.refundNo}</td>
                  <td>{refund.orderId}</td>
                  <td>{money(refund.amount)}</td>
                  <td>{refund.status}</td>
                  <td>{refund.reason || '-'}</td>
                  <td>{refund.createdAt.slice(0, 10)}</td>
                </tr>
              )) : returnedOrders.length ? returnedOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.id}</td>
                  <td>{money(order.total)}</td>
                  <td>{zhOrderStatus(order.status)}</td>
                  <td>{order.refundStatus || '订单处于售后状态'}</td>
                  <td>{order.updatedAt.slice(0, 10)}</td>
                </tr>
              )) : <tr><td colSpan={6}>暂无退换货或退款记录。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

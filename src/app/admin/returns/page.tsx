import AdminShell from '@/components/AdminShell';
import {readRefundRecords, readStoreOrders, type RefundRecord, type StoreOrder} from '@/lib/commerceStore';
import {zhOrderStatus} from '@/lib/adminZh';
import AdminPagination from '@/components/AdminPagination';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return `USD ${value.toLocaleString()}`;
}

type ReturnRecord = {kind: 'refund'; refund: RefundRecord} | {kind: 'order'; order: StoreOrder};

export default async function AdminReturnsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const [orders, refunds, params] = await Promise.all([readStoreOrders(), readRefundRecords(), searchParams]);
  const {page, perPage} = parseAdminPagination(params);
  const returnedOrders = orders.filter((order) => order.shipmentStatus === 'returned' || ['refunded', 'partial_refunded'].includes(order.status));
  const pendingRefunds = refunds.filter((refund) => ['pending', 'submitted'].includes(refund.status));
  const records: ReturnRecord[] = refunds.length ? refunds.slice().reverse().map((refund) => ({kind: 'refund', refund})) : returnedOrders.map((order) => ({kind: 'order', order}));
  const pagedRecords = paginate(records, page, perPage);

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
              {pagedRecords.items.length ? pagedRecords.items.map((entry) => entry.kind === 'refund' ? (
                <tr key={entry.refund.id}>
                  <td>{entry.refund.refundNo}</td>
                  <td>{entry.refund.orderId}</td>
                  <td>{money(entry.refund.amount)}</td>
                  <td>{entry.refund.status}</td>
                  <td>{entry.refund.reason || '-'}</td>
                  <td>{entry.refund.createdAt.slice(0, 10)}</td>
                </tr>
              ) : (
                <tr key={entry.order.id}>
                  <td>{entry.order.id}</td>
                  <td>{entry.order.id}</td>
                  <td>{money(entry.order.total)}</td>
                  <td>{zhOrderStatus(entry.order.status)}</td>
                  <td>{entry.order.refundStatus || '订单处于售后状态'}</td>
                  <td>{entry.order.updatedAt.slice(0, 10)}</td>
                </tr>
              )) : <tr><td colSpan={6}>暂无退换货或退款记录。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/returns" params={params} page={pagedRecords.page} perPage={pagedRecords.perPage} total={pagedRecords.total} totalPages={pagedRecords.totalPages} />
      </section>
    </AdminShell>
  );
}

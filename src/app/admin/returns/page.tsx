import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {readRefundRecords, readStoreOrders} from '@/lib/commerceStore';
import {zhOrderStatus} from '@/lib/adminZh';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return `USD ${value.toLocaleString()}`;
}

export default async function AdminReturnsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>;}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const [orders, refunds] = await Promise.all([readStoreOrders(), readRefundRecords()]);
  const inRange = (value: string) => { const time = new Date(value).getTime(); return time >= timeFilter.from.getTime() && time <= timeFilter.to.getTime(); };
  const returnedOrders = orders.filter((order) => inRange(order.updatedAt) && (order.shipmentStatus === 'returned' || ['refunded', 'partial_refunded'].includes(order.status)));
  const filteredRefunds = refunds.filter((refund) => inRange(refund.createdAt)).slice().reverse();
  const pendingRefunds = filteredRefunds.filter((refund) => ['pending', 'submitted'].includes(refund.status));
  const rows: Array<{kind: 'refund' | 'order'; id: string; reference: string; orderId: string; amount: number; status: string; reason: string; time: string}> = filteredRefunds.length
    ? filteredRefunds.map((refund) => ({kind: 'refund' as const, id: refund.id, reference: refund.refundNo, orderId: refund.orderId, amount: refund.amount, status: refund.status, reason: refund.reason || '-', time: refund.createdAt}))
    : returnedOrders.map((order) => ({kind: 'order' as const, id: order.id, reference: order.id, orderId: order.id, amount: order.total, status: zhOrderStatus(order.status), reason: order.refundStatus || '订单处于售后状态', time: order.updatedAt}));
  const pagedRefunds = paginate(rows, page, perPage);

  return (
    <AdminShell active="returns">
      <div className="admin-title">
        <p className="eyebrow">退换货管理</p>
        <h1>退换货管理</h1>
        <p>目前系统已接入退款记录和退回物流状态；独立退货申请表、质检结果和换货单需要在售后流程确认后继续接入。</p>
        <AdminTimeFilter action="/admin/returns" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="售后处理时间" summary={timeFilter.summary} />
      </div>

      <div className="admin-metrics">
        <article><span>售后相关订单</span><strong>{returnedOrders.length}</strong><small>退款或退回状态</small></article>
        <article><span>待处理退款</span><strong>{pendingRefunds.length}</strong><small>pending/submitted</small></article>
        <article><span>退款总额</span><strong>{money(filteredRefunds.reduce((sum, refund) => sum + refund.amount, 0))}</strong><small>所选时间退款合计</small></article>
        <article><span>售后记录</span><strong>{filteredRefunds.length}</strong><small>退款流水</small></article>
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
              {pagedRefunds.items.length ? pagedRefunds.items.map((record) => <tr key={record.id}><td>{record.reference}</td><td>{record.orderId}</td><td>{money(record.amount)}</td><td>{record.status}</td><td>{record.reason}</td><td>{record.time.slice(0, 10)}</td></tr>) : <tr><td colSpan={6}>所选时间暂无退换货或退款记录。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/returns" params={params} page={pagedRefunds.page} perPage={pagedRefunds.perPage} total={pagedRefunds.total} totalPages={pagedRefunds.totalPages} />
      </section>
    </AdminShell>
  );
}

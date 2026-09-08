import AdminPagination from '@/components/AdminPagination';
import AdminShell from '@/components/AdminShell';
import AdminTimeFilter from '@/components/AdminTimeFilter';
import {paginate, parseAdminPagination} from '@/lib/adminPagination';
import {parseAdminTimeFilter} from '@/lib/adminTimeFilter';
import {
  getCommerceSnapshot,
  readAuthorizationRecords,
  readPaymentNotifications,
  readRefundRecords
} from '@/lib/commerceStore';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return `USD ${value.toLocaleString()}`;
}

export default async function AdminPaymentsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>;}) {
  const params = await searchParams;
  const timeFilter = parseAdminTimeFilter(params);
  const {page, perPage} = parseAdminPagination(params);
  const [snapshot, refunds, notifications, authorizations] = await Promise.all([
    getCommerceSnapshot({from: timeFilter.from, to: timeFilter.to}),
    readRefundRecords(),
    readPaymentNotifications(),
    readAuthorizationRecords()
  ]);
  const inRange = (value: string) => { const time = new Date(value).getTime(); return time >= timeFilter.from.getTime() && time <= timeFilter.to.getTime(); };
  const filteredRefunds = refunds.filter((item) => inRange(item.createdAt)).slice().reverse();
  const filteredNotifications = notifications.filter((item) => inRange(item.createdAt));
  const filteredAuthorizations = authorizations.filter((item) => inRange(item.createdAt));
  const verifiedNotifications = filteredNotifications.filter((item) => item.verified);
  const refundAmount = filteredRefunds.reduce((sum, refund) => sum + refund.amount, 0);
  const pagedRefunds = paginate(filteredRefunds, page, perPage);

  return (
    <AdminShell active="payments">
      <div className="admin-title">
        <p className="eyebrow">支付与退款</p>
        <h1>支付与退款</h1>
        <p>集中查看 Oceanpayment 配置状态、支付回调、退款记录和预授权操作。系统不会保存银行卡号、CVV 等敏感卡信息。</p>
        <AdminTimeFilter action="/admin/payments" range={timeFilter.range} start={timeFilter.start} end={timeFilter.end} label="支付处理时间" summary={timeFilter.summary} />
      </div>

      <div className="admin-metrics">
        <article><span>网关状态</span><strong>{snapshot.paymentGateway.status === 'env_ready' ? '已配置' : '待配置'}</strong><small>{snapshot.paymentGateway.provider}</small></article>
        <article><span>回调通知</span><strong>{filteredNotifications.length}</strong><small>已验证 {verifiedNotifications.length} 条</small></article>
        <article><span>退款笔数</span><strong>{filteredRefunds.length}</strong><small>退款合计 {money(refundAmount)}</small></article>
        <article><span>预授权记录</span><strong>{filteredAuthorizations.length}</strong><small>授权/捕获/取消记录</small></article>
      </div>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">支付配置</p>
          <h2>Oceanpayment 接入状态</h2>
        </div>
        <dl className="admin-config-list">
          <div><dt>创建支付接口</dt><dd>{snapshot.paymentGateway.createEndpoint}</dd></div>
          <div><dt>支付回调接口</dt><dd>{snapshot.paymentGateway.notifyEndpoint}</dd></div>
          <div><dt>当前状态</dt><dd>{snapshot.paymentGateway.status === 'env_ready' ? '环境变量已配置，可以发起网关支付。' : '还缺少 Oceanpayment 商户号、终端号、安全码或公钥。'}</dd></div>
          <div><dt>安全要求</dt><dd>支付回调必须做签名校验和幂等处理；后台退款、导出和支付配置变更需要写入操作日志。</dd></div>
        </dl>
      </section>

      <section className="admin-panel">
        <div>
          <p className="eyebrow">退款记录</p>
          <h2>退款处理</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr><th>退款单号</th><th>订单号</th><th>金额</th><th>状态</th><th>原因</th><th>时间</th></tr>
            </thead>
            <tbody>
              {pagedRefunds.items.length ? pagedRefunds.items.map((refund) => (
                <tr key={refund.id}>
                  <td>{refund.refundNo}</td>
                  <td>{refund.orderId}</td>
                  <td>{money(refund.amount)}</td>
                  <td>{refund.status}</td>
                  <td>{refund.reason || '-'}</td>
                  <td>{refund.createdAt.slice(0, 10)}</td>
                </tr>
              )) : <tr><td colSpan={6}>所选时间暂无退款记录。</td></tr>}
            </tbody>
          </table>
        </div>
        <AdminPagination basePath="/admin/payments" params={params} page={pagedRefunds.page} perPage={pagedRefunds.perPage} total={pagedRefunds.total} totalPages={pagedRefunds.totalPages} />
      </section>
    </AdminShell>
  );
}

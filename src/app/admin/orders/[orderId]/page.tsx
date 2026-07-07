import {notFound} from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import AdminOrderActions from '@/components/AdminOrderActions';
import {
  findStoreOrder,
  readAuthorizationRecords,
  readEmailLogs,
  readPaymentNotifications,
  readRefundRecords,
  readShipmentRecords
} from '@/lib/commerceStore';

export const dynamic = 'force-dynamic';

function money(value: number) {
  return `USD ${value.toLocaleString()}`;
}

function JsonBlock({value}: {value: unknown}) {
  return <pre className="admin-json">{JSON.stringify(value, null, 2)}</pre>;
}

export default async function AdminOrderDetailPage({params}: {params: Promise<{orderId: string}>}) {
  const {orderId} = await params;
  const order = await findStoreOrder(orderId);
  if (!order) notFound();
  const [refunds, shipments, authorizations, emails, notifications] = await Promise.all([
    readRefundRecords(),
    readShipmentRecords(),
    readAuthorizationRecords(),
    readEmailLogs(),
    readPaymentNotifications()
  ]);
  const orderRefunds = refunds.filter((item) => item.orderId === order.id).reverse();
  const orderShipments = shipments.filter((item) => item.orderId === order.id).reverse();
  const orderAuthorizations = authorizations.filter((item) => item.orderId === order.id).reverse();
  const orderEmails = emails.filter((item) => item.orderId === order.id || item.customerEmail === order.customer.email).reverse();
  const orderNotifications = notifications.filter((item) => item.orderId === order.id).reverse();

  return (
    <AdminShell active="orders">
      <div className="admin-title">
        <p className="eyebrow">订单详情</p>
        <h1>{order.id}</h1>
        <p>{order.productName} x {order.quantity}，金额 {money(order.total)}</p>
      </div>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>买家信息</h2>
          <dl className="admin-detail-list">
            <div><dt>姓名</dt><dd>{order.customer.name}</dd></div>
            <div><dt>邮箱</dt><dd>{order.customer.email}</dd></div>
            <div><dt>电话</dt><dd>{order.customer.phone}</dd></div>
            <div><dt>国家/地区</dt><dd>{order.customer.country}</dd></div>
            <div><dt>地址</dt><dd>{order.customer.address}</dd></div>
            <div><dt>客户 ID</dt><dd>{order.userId || '暂未关联'}</dd></div>
          </dl>
        </article>
        <article className="admin-panel">
          <h2>订单状态</h2>
          <dl className="admin-detail-list">
            <div><dt>订单</dt><dd>{order.status}</dd></div>
            <div><dt>支付网关</dt><dd>{order.gatewayStatus}</dd></div>
            <div><dt>支付 ID</dt><dd>{order.paymentId || order.transactionId || '等待支付'}</dd></div>
            <div><dt>退款</dt><dd>{order.refundStatus || '无'}</dd></div>
            <div><dt>物流</dt><dd>{order.shipmentStatus}</dd></div>
            <div><dt>追踪单号</dt><dd>{order.trackingNumber || '未发货'}</dd></div>
          </dl>
        </article>
      </section>

      <section className="admin-panel">
        <h2>后台操作</h2>
        <AdminOrderActions orderId={order.id} total={order.total} />
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel"><h2>支付通知记录</h2>{orderNotifications.length ? orderNotifications.map((item) => <JsonBlock key={item.id} value={item} />) : <p>暂无支付通知记录。</p>}</article>
        <article className="admin-panel"><h2>邮件日志</h2>{orderEmails.length ? orderEmails.map((item) => <JsonBlock key={item.id} value={item} />) : <p>暂无邮件日志。</p>}</article>
        <article className="admin-panel"><h2>物流记录</h2>{orderShipments.length ? orderShipments.map((item) => <JsonBlock key={item.id} value={item} />) : <p>暂无物流记录。</p>}</article>
        <article className="admin-panel"><h2>退款记录</h2>{orderRefunds.length ? orderRefunds.map((item) => <JsonBlock key={item.id} value={item} />) : <p>暂无退款记录。</p>}</article>
        <article className="admin-panel"><h2>预授权记录</h2>{orderAuthorizations.length ? orderAuthorizations.map((item) => <JsonBlock key={item.id} value={item} />) : <p>暂无预授权记录。</p>}</article>
      </section>
    </AdminShell>
  );
}

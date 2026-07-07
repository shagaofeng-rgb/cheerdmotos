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
        <p className="eyebrow">Order detail</p>
        <h1>{order.id}</h1>
        <p>{order.productName} x {order.quantity} · {money(order.total)}</p>
      </div>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Buyer</h2>
          <dl className="admin-detail-list">
            <div><dt>Name</dt><dd>{order.customer.name}</dd></div>
            <div><dt>Email</dt><dd>{order.customer.email}</dd></div>
            <div><dt>Phone</dt><dd>{order.customer.phone}</dd></div>
            <div><dt>Country</dt><dd>{order.customer.country}</dd></div>
            <div><dt>Address</dt><dd>{order.customer.address}</dd></div>
            <div><dt>Customer ID</dt><dd>{order.userId || 'Not linked yet'}</dd></div>
          </dl>
        </article>
        <article className="admin-panel">
          <h2>Status</h2>
          <dl className="admin-detail-list">
            <div><dt>Order</dt><dd>{order.status}</dd></div>
            <div><dt>Gateway</dt><dd>{order.gatewayStatus}</dd></div>
            <div><dt>Payment ID</dt><dd>{order.paymentId || order.transactionId || 'Waiting'}</dd></div>
            <div><dt>Refund</dt><dd>{order.refundStatus || 'None'}</dd></div>
            <div><dt>Shipment</dt><dd>{order.shipmentStatus}</dd></div>
            <div><dt>Tracking</dt><dd>{order.trackingNumber || 'Not shipped'}</dd></div>
          </dl>
        </article>
      </section>

      <section className="admin-panel">
        <h2>Admin operations</h2>
        <AdminOrderActions orderId={order.id} total={order.total} />
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel"><h2>Payment notifications</h2>{orderNotifications.length ? orderNotifications.map((item) => <JsonBlock key={item.id} value={item} />) : <p>No payment notice records yet.</p>}</article>
        <article className="admin-panel"><h2>Email logs</h2>{orderEmails.length ? orderEmails.map((item) => <JsonBlock key={item.id} value={item} />) : <p>No email logs yet.</p>}</article>
        <article className="admin-panel"><h2>Shipment records</h2>{orderShipments.length ? orderShipments.map((item) => <JsonBlock key={item.id} value={item} />) : <p>No shipment records yet.</p>}</article>
        <article className="admin-panel"><h2>Refund records</h2>{orderRefunds.length ? orderRefunds.map((item) => <JsonBlock key={item.id} value={item} />) : <p>No refund records yet.</p>}</article>
        <article className="admin-panel"><h2>Authorization records</h2>{orderAuthorizations.length ? orderAuthorizations.map((item) => <JsonBlock key={item.id} value={item} />) : <p>No authorization records yet.</p>}</article>
      </section>
    </AdminShell>
  );
}

import Link from 'next/link';
import {notFound, redirect} from 'next/navigation';
import {findStoreOrder, readShipmentRecords} from '@/lib/commerceStore';
import {customerOwnsOrder, getCustomerSession} from '@/lib/customerAuth';
import {products} from '@/lib/site';

export const dynamic = 'force-dynamic';

function money(value: number, currency = 'USD') {
  return `${currency} ${value.toLocaleString()}`;
}

export default async function AccountOrderDetailPage({params}: {params: Promise<{orderNo: string}>}) {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');
  const {orderNo} = await params;
  const order = await findStoreOrder(orderNo);
  if (!order || !customerOwnsOrder(order, session)) notFound();
  const shipments = (await readShipmentRecords()).filter((item) => item.orderId === order.id).reverse();
  const shipment = shipments[0] || null;
  const trackingUrl = shipment?.trackingUrl || order.trackingUrl;
  const customerVisibleNote = shipment?.customerVisibleNote || order.customerVisibleNote;

  return (
    <main className="account-page wide">
      <section className="account-header">
        <div>
          <p className="eyebrow">Order detail</p>
          <h1>{order.id}</h1>
          <p>{order.createdAt.slice(0, 10)} · {order.status.replace(/_/g, ' ')}</p>
        </div>
        <Link className="button secondary" href="/account/orders">Back to orders</Link>
      </section>

      <section className="account-detail-grid">
        <article className="account-order-card">
          <h2>Product</h2>
          <img className="account-detail-image" src={products[order.productSlug]?.image || '/assets/logo.jpg'} alt={order.productName} />
          <dl>
            <div><dt>Name</dt><dd>{order.productName}</dd></div>
            <div><dt>SKU / model</dt><dd>{order.productSlug}</dd></div>
            <div><dt>Quantity</dt><dd>{order.quantity}</dd></div>
            <div><dt>Unit price</dt><dd>{money(order.unitPrice, order.currency)}</dd></div>
            <div><dt>Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
            <div><dt>Shipping</dt><dd>{money(order.shippingEstimate, order.currency)}</dd></div>
            <div><dt>Total</dt><dd>{money(order.total, order.currency)}</dd></div>
          </dl>
        </article>

        <article className="account-order-card">
          <h2>Payment</h2>
          <dl>
            <div><dt>Status</dt><dd>{order.gatewayStatus.replace(/_/g, ' ')}</dd></div>
            <div><dt>Amount</dt><dd>{money(order.total, order.currency)}</dd></div>
            <div><dt>Currency</dt><dd>{order.currency}</dd></div>
            <div><dt>Method</dt><dd>{order.paymentMethod.replace(/_/g, ' ')}</dd></div>
            <div><dt>Payment ID</dt><dd>{order.paymentId || order.transactionId || 'Payment confirmation is processing'}</dd></div>
            <div><dt>Refund</dt><dd>{order.refundStatus || 'None'}</dd></div>
          </dl>
        </article>

        <article className="account-order-card">
          <h2>Shipping</h2>
          <dl>
            <div><dt>Status</dt><dd>{order.shipmentStatus === 'unshipped' ? 'Not shipped yet' : order.shipmentStatus.replace(/_/g, ' ')}</dd></div>
            <div><dt>Provider</dt><dd>{shipment?.logisticsProvider || order.logisticsProvider || 'Not available yet'}</dd></div>
            <div><dt>Tracking number</dt><dd className="breakable">{shipment?.trackingNumber || order.trackingNumber || 'Not available yet'}</dd></div>
            <div><dt>Shipped at</dt><dd>{shipment?.shippedAt || order.shippedAt || 'Not shipped yet'}</dd></div>
            <div><dt>Estimated delivery</dt><dd>{shipment?.estimatedDeliveryAt || order.estimatedDeliveryAt || 'Not available yet'}</dd></div>
            <div><dt>Delivered at</dt><dd>{shipment?.deliveredAt || order.deliveredAt || 'Not delivered yet'}</dd></div>
            <div><dt>Note</dt><dd>{customerVisibleNote || 'No shipment note yet'}</dd></div>
          </dl>
          {trackingUrl ? <a className="button secondary small" href={trackingUrl} target="_blank" rel="noopener noreferrer nofollow">Track shipment</a> : null}
        </article>

        <article className="account-order-card">
          <h2>Customer</h2>
          <dl>
            <div><dt>Name</dt><dd>{order.customer.name}</dd></div>
            <div><dt>Email</dt><dd>{order.customer.email}</dd></div>
            <div><dt>Phone</dt><dd>{order.customer.phone}</dd></div>
            <div><dt>Country</dt><dd>{order.customer.country}</dd></div>
            <div><dt>Address</dt><dd>{order.customer.address}</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}

import Link from 'next/link';
import {redirect} from 'next/navigation';
import {customerOwnsOrder, getCustomerSession} from '@/lib/customerAuth';
import {readStoreOrders} from '@/lib/commerceStore';
import {products} from '@/lib/site';

export const dynamic = 'force-dynamic';

function money(value: number, currency = 'USD') {
  return `${currency} ${value.toLocaleString()}`;
}

export default async function AccountOrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');
  const email = session.email || '';
  const orders = (await readStoreOrders())
    .filter((order) => customerOwnsOrder(order, session))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="account-page wide">
      <section className="account-header">
        <div>
          <p className="eyebrow">Customer center</p>
          <h1>Your orders</h1>
          <p>{email}</p>
        </div>
        <form action="/api/account/logout" method="post">
          <button className="button secondary" type="submit">Log out</button>
        </form>
      </section>
      <section className="account-order-list">
        {orders.length ? orders.map((order) => (
          <article className="account-order-card" key={order.id}>
            <img className="account-order-thumb" src={products[order.productSlug]?.thumbnail || '/assets/logo-small.jpg'} alt={order.productName} />
            <div>
              <small>{order.id}</small>
              <h2>{order.productName}</h2>
              <p>{order.quantity} unit(s) · {money(order.total, order.currency)}</p>
            </div>
            <dl>
              <div><dt>Order status</dt><dd>{order.status.replace(/_/g, ' ')}</dd></div>
              <div><dt>Payment</dt><dd>{order.gatewayStatus.replace(/_/g, ' ')}</dd></div>
              <div><dt>Shipment</dt><dd>{order.shipmentStatus.replace(/_/g, ' ')}</dd></div>
              <div><dt>Tracking</dt><dd>{order.trackingNumber || 'Waiting for shipment'}</dd></div>
            </dl>
            <Link className="button secondary small" href={`/account/orders/${order.id}`}>View detail</Link>
          </article>
        )) : (
          <article className="account-order-card empty">
            <span className="account-empty-mark">0</span>
            <h2>No orders yet</h2>
            <p>Orders placed with this email will appear here after checkout.</p>
            <Link className="button primary" href="/en/products">Browse products</Link>
          </article>
        )}
      </section>
    </main>
  );
}

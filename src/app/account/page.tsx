import Link from 'next/link';
import {redirect} from 'next/navigation';
import {readStoreOrders} from '@/lib/commerceStore';
import {findCustomerUserById, getCustomerSession, customerOwnsOrder} from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');
  const userId = session.userId || '';
  if (!userId) redirect('/account/login');
  const user = await findCustomerUserById(userId);
  if (!user) redirect('/account/login');
  const orders = (await readStoreOrders()).filter((order) => customerOwnsOrder(order, session));
  const recentOrders = orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const shippedCount = orders.filter((order) => ['shipped', 'in_transit', 'delivered'].includes(order.shipmentStatus)).length;
  const pendingShipment = orders.filter((order) => order.status === 'paid' && order.shipmentStatus === 'unshipped').length;

  return (
    <main className="account-page wide">
      <section className="account-header">
        <div>
          <p className="eyebrow">Customer center</p>
          <h1>Welcome, {user.name}</h1>
          <p>{user.email}</p>
        </div>
        <form action="/api/account/logout" method="post">
          <button className="button secondary" type="submit">Log out</button>
        </form>
      </section>
      <section className="account-summary-grid">
        <article className="account-order-card"><small>Total orders</small><h2>{orders.length}</h2></article>
        <article className="account-order-card"><small>Waiting shipment</small><h2>{pendingShipment}</h2></article>
        <article className="account-order-card"><small>Shipped orders</small><h2>{shippedCount}</h2></article>
      </section>
      <section className="account-order-list">
        <div className="account-section-title">
          <h2>Recent orders</h2>
          <Link className="button secondary small" href="/account/orders">View all</Link>
        </div>
        {recentOrders.length ? recentOrders.map((order) => (
          <article className="account-order-card" key={order.id}>
            <div>
              <small>{order.id}</small>
              <h2>{order.productName}</h2>
              <p>{order.currency} {order.total.toLocaleString()} · {order.gatewayStatus.replace(/_/g, ' ')}</p>
            </div>
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
      <section className="account-actions">
        <Link className="button secondary" href="/account/profile">Profile</Link>
        <Link className="button secondary" href="/account/security">Account security</Link>
      </section>
    </main>
  );
}

import {StoreAccountContent, StoreOrderRows} from '@/components/StorefrontAccount';
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
    <StoreAccountContent active="/account">
      <section className="account-header">
        <div>
          <p className="kicker">Customer center</p>
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
      <StoreOrderRows title="Recent orders" orders={recentOrders}>
        {recentOrders.length > 0 && <Link className="inline sf-spaced" href="/account/orders">View all orders</Link>}
      </StoreOrderRows>
      <section className="account-actions">
        <Link className="button secondary" href="/account/profile">Profile</Link>
        <Link className="button secondary" href="/account/security">Account security</Link>
      </section>
    </StoreAccountContent>
  );
}

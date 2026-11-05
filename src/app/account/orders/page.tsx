import {StoreAccountContent, StoreOrderRows} from '@/components/StorefrontAccount';
import {redirect} from 'next/navigation';
import {customerOwnsOrder, getCustomerSession} from '@/lib/customerAuth';
import {readStoreOrders} from '@/lib/commerceStore';
import StorefrontPagination from '@/components/StorefrontPagination';
import {paginateItems, readPage, type SearchParams} from '@/lib/storefrontPagination';

export const dynamic = 'force-dynamic';

export default async function AccountOrdersPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');
  const query = await searchParams;
  const orders = (await readStoreOrders())
    .filter((order) => customerOwnsOrder(order, session))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pagedOrders = paginateItems(orders, readPage(query.page));

  return (
    <StoreAccountContent active="/account/orders">
      <section className="account-header">
        <div>
          <p className="kicker">Customer center</p>
          <h1>Your orders</h1>
          <p>Track orders and review purchase details.</p>
        </div>
        <form action="/api/account/logout" method="post">
          <button className="button secondary" type="submit">Log out</button>
        </form>
      </section>
      <StoreOrderRows title="Order history" orders={pagedOrders.items} />
      <StorefrontPagination pathname="/account/orders" params={query} label="Order history" {...pagedOrders} />
    </StoreAccountContent>
  );
}

import {redirect} from 'next/navigation';
import AccountProfileForm from '@/components/AccountProfileForm';
import {findCustomerUserById, getCustomerSession} from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export default async function AccountProfilePage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');
  const userId = session.userId || '';
  if (!userId) redirect('/account/login');
  const user = await findCustomerUserById(userId);
  if (!user) redirect('/account/login');

  return (
    <main className="account-page">
      <section className="account-card">
        <p className="eyebrow">Customer center</p>
        <h1>Profile</h1>
        <p>{user.email}</p>
        <AccountProfileForm firstName={user.firstName} lastName={user.lastName} country={user.country} />
      </section>
    </main>
  );
}

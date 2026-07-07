import {redirect} from 'next/navigation';
import AccountSecurityForm from '@/components/AccountSecurityForm';
import {getCustomerSession} from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export default async function AccountSecurityPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');

  return (
    <main className="account-page">
      <section className="account-card">
        <p className="eyebrow">Customer center</p>
        <h1>Account security</h1>
        <p>Change your password with your current password.</p>
        <AccountSecurityForm />
      </section>
    </main>
  );
}

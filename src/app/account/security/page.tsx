import {StoreAccountContent} from '@/components/StorefrontAccount';
import {redirect} from 'next/navigation';
import AccountSecurityForm from '@/components/AccountSecurityForm';
import {getCustomerSession} from '@/lib/customerAuth';

export const dynamic = 'force-dynamic';

export default async function AccountSecurityPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');

  return (
    <StoreAccountContent active="/account/security">
      <section className="account-card">
        <p className="kicker">Customer center</p>
        <h1>Account security</h1>
        <p>Change your password with your current password.</p>
        <AccountSecurityForm />
      </section>
    </StoreAccountContent>
  );
}

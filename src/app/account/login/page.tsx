import AccountAuthForm from '@/components/AccountAuthForm';

export const dynamic = 'force-dynamic';

export default function AccountLoginPage() {
  return (
    <main className="account-page account-register-page">
      <section className="account-card account-register-card account-email-card">
        <h1>Sign in to CHEERDMOTO</h1>
        <p className="account-card-copy">To continue to your member center</p>
        <AccountAuthForm mode="login" />
      </section>
    </main>
  );
}

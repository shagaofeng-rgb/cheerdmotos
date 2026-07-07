import AccountAuthForm from '@/components/AccountAuthForm';

export const dynamic = 'force-dynamic';

export default function AccountRegisterPage() {
  return (
    <main className="account-page account-register-page">
      <section className="account-card account-register-card account-email-card">
        <h1>Create your CHEERDMOTO account</h1>
        <p className="account-card-copy">Set a password to access your member center and checkout orders.</p>
        <AccountAuthForm mode="register" />
      </section>
    </main>
  );
}

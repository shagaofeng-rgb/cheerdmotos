import Link from 'next/link';
import AccountAuthForm from '@/components/AccountAuthForm';

export const dynamic = 'force-dynamic';

export default async function AccountResetPasswordPage({searchParams}: {searchParams: Promise<{token?: string}>}) {
  const params = await searchParams;
  const token = params.token || '';
  return (
    <main className="account-page">
      <section className="account-card">
        <p className="eyebrow">Customer account</p>
        <h1>{token ? 'Set your password' : 'Reset your password'}</h1>
        <p>{token ? 'Create a password to activate your customer order center.' : 'Enter your email and we will send a password reset link if the account exists.'}</p>
        <AccountAuthForm mode={token ? 'reset' : 'forgot'} token={token} />
        <div className="account-links">
          <Link href="/account/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}

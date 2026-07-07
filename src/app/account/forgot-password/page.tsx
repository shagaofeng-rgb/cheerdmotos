import Link from 'next/link';
import AccountAuthForm from '@/components/AccountAuthForm';

export const dynamic = 'force-dynamic';

export default function AccountForgotPasswordPage() {
  return (
    <main className="account-page">
      <section className="account-card">
        <p className="eyebrow">Customer account</p>
        <h1>Reset your password</h1>
        <p>Enter your email and we will send a password reset link if the account exists.</p>
        <AccountAuthForm mode="forgot" />
        <div className="account-links">
          <Link href="/account/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}

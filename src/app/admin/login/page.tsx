export default async function AdminLoginPage({searchParams}: {searchParams: Promise<{error?: string; reset?: string}>}) {
  const query = await searchParams;

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" action="/api/admin/login" method="post">
        <p className="eyebrow">CHEERDMOTO Admin</p>
        <h1>Admin Login</h1>
        <p>Sign in to manage products, orders, customers, leads, analytics, payments, content and site settings.</p>
        {query.error ? <strong className="admin-login-error">Login failed. Please check your email and password.</strong> : null}
        {query.reset ? <strong className="admin-login-notice">Password reset request received. SMTP must be configured before reset email delivery works.</strong> : null}
        <label>
          Email
          <input name="email" type="email" defaultValue="support@cheerdmotos.com" required />
        </label>
        <label>
          Password
          <input name="password" type="password" placeholder="Enter admin password" required />
        </label>
        <button className="button primary" type="submit">Log in</button>
        <small><a href="/admin/forgot-password">Forgot password?</a></small>
        <small>Production credentials are stored in Vercel environment variables and are not committed to frontend code.</small>
      </form>
    </main>
  );
}

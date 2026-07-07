export const dynamic = 'force-dynamic';

export default async function PricingAdminLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const account = typeof params.account === 'string' ? params.account : '';
  return (
    <main className="pricing-login-page">
      <form className="pricing-login-card" action="/api/pricing-admin/login" method="post">
        <p className="pricing-kicker">CHEERDMOTO Pricing Admin</p>
        <h1>计价后台登录</h1>
        <p>这个后台独立用于价格、汇率、佣金和成交订单记录。</p>
        {params.error ? <strong className="pricing-login-error">登录失败，请检查账号或密码。</strong> : null}
        <label>
          账号
          <input name="email" type="text" autoComplete="username" defaultValue={account} placeholder="cowin202601 / cowin202602" required />
        </label>
        <label>
          密码
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <div className="pricing-login-links">
          <a href="/pricing-admin/cowin202601">业务员 01 入口</a>
          <a href="/pricing-admin/cowin202602">业务员 02 入口</a>
        </div>
        <button className="pricing-primary-button" type="submit">登录计价后台</button>
      </form>
    </main>
  );
}

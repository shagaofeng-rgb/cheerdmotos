export default async function AdminLoginPage({searchParams}: {searchParams: Promise<{error?: string; reset?: string}>}) {
  const query = await searchParams;

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" action="/api/admin/login" method="post">
        <p className="eyebrow">CHEERDMOTO 后台</p>
        <h1>管理员登录</h1>
        <p>登录后可以管理产品、订单、客户、线索、访问数据、支付配置、内容和网站设置。</p>
        {query.error ? <strong className="admin-login-error">登录失败，请检查邮箱和密码。</strong> : null}
        {query.reset ? <strong className="admin-login-notice">密码重置请求已收到。发送重置邮件前需要先配置 SMTP。</strong> : null}
        <label>
          管理员邮箱
          <input name="email" type="email" defaultValue="support@cheerdmotos.com" required />
        </label>
        <label>
          登录密码
          <input name="password" type="password" placeholder="请输入后台密码" required />
        </label>
        <button className="button primary" type="submit">登录后台</button>
        <small><a href="/admin/forgot-password">忘记密码？</a></small>
        <small>正式密码保存在 Vercel 环境变量中，不会写入前端代码。</small>
      </form>
    </main>
  );
}

export default async function AdminLoginPage({searchParams}: {searchParams: Promise<{error?: string; reset?: string}>}) {
  const query = await searchParams;

  return (
    <main className="admin-login-page">
      <form className="admin-login-card" action="/api/admin/login" method="post">
        <p className="eyebrow">在海后台</p>
        <h1>后台登录</h1>
        <p>登录后可查看订单、客户线索、访问统计、转化漏斗和支付接口状态。</p>
        {query.error ? <strong className="admin-login-error">登录失败，请检查邮箱和密码。</strong> : null}
        {query.reset ? <strong className="admin-login-notice">已收到重置请求。需要配置 SMTP 后才能发送安全重置邮件。</strong> : null}
        <label>
          邮箱
          <input name="email" type="email" defaultValue="support@cheerdmotos.com" required />
        </label>
        <label>
          密码
          <input name="password" type="password" placeholder="请输入后台密码" required />
        </label>
        <button className="button primary" type="submit">
          登录后台
        </button>
        <small><a href="/admin/forgot-password">忘记密码？</a></small>
        <small>生产环境密码存放在 Vercel 环境变量中，不会写入前端代码。</small>
      </form>
    </main>
  );
}

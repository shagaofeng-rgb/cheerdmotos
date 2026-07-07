export default function AdminResetPasswordPage() {
  return (
    <main className="admin-login-page">
      <form className="admin-login-card" action="/api/admin/reset-password" method="post">
        <p className="eyebrow">密码重置</p>
        <h1>设置新密码</h1>
        <p>此页面预留给邮件 Token 重置流程。正式使用前需要配置 SMTP 和重置 Token 存储。</p>
        <label>
          重置 Token
          <input name="token" required placeholder="邮件中的 Token" />
        </label>
        <label>
          新密码
          <input name="password" type="password" required placeholder="新的安全密码" />
        </label>
        <button className="button primary" type="submit">重置密码</button>
        <small><a href="/admin/login">返回登录</a></small>
      </form>
    </main>
  );
}

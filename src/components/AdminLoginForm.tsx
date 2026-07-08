'use client';

import {useState} from 'react';

type Props = {
  hasError: boolean;
  hasResetNotice: boolean;
};

function EyeIcon({open}: {open: boolean}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2.5 12s3.4-6.5 9.5-6.5S21.5 12 21.5 12s-3.4 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      {!open ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

export default function AdminLoginForm({hasError, hasResetNotice}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form className="admin-login-card" action="/api/admin/login" method="post" onSubmit={() => setSubmitting(true)}>
      <p className="eyebrow">CHEERDMOTO 后台</p>
      <h1>管理员登录</h1>
      <p>登录后可以管理商品、订单、客户、线索、访问数据、支付配置、内容和网站设置。</p>

      {hasError ? <strong className="admin-login-error">登录失败，请检查邮箱和密码；多次失败会触发临时限制。</strong> : null}
      {hasResetNotice ? <strong className="admin-login-notice">密码重置请求已收到，系统会按已配置的 SMTP 邮箱发送通知。</strong> : null}

      <label>
        管理员邮箱
        <input name="email" type="email" defaultValue="support@cheerdmotos.com" autoComplete="username" required />
      </label>

      <label className="admin-password-field">
        登录密码
        <span className="admin-password-control">
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="请输入后台密码"
            autoComplete="current-password"
            required
          />
          <button
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            className="admin-password-toggle"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
          >
            <EyeIcon open={showPassword} />
          </button>
        </span>
      </label>

      <label className="admin-checkbox-line">
        <input name="remember" type="checkbox" value="1" />
        <span>记住登录状态</span>
      </label>

      <button className="button primary" type="submit" disabled={submitting}>
        {submitting ? '正在登录...' : '登录后台'}
      </button>

      <small>
        <a href="/admin/forgot-password">忘记密码？</a>
      </small>
      <small>正式密码保存在 Vercel 环境变量中，不会写入前端代码。</small>
    </form>
  );
}

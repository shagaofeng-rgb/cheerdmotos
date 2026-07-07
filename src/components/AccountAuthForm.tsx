'use client';

import {useState} from 'react';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

export default function AccountAuthForm({mode, token = ''}: {mode: Mode; token?: string}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const isCompactEntry = mode === 'login' || mode === 'register';
  const requiresPassword = mode === 'login' || mode === 'register' || mode === 'reset';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    const endpoint = {
      login: '/api/account/login',
      register: '/api/account/register',
      forgot: '/api/account/forgot-password',
      reset: '/api/account/reset-password'
    }[mode];

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...body, token})
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(result.message || 'Request failed. Please try again.');
        return;
      }
      if (mode === 'forgot') {
        setStatus(result.message || 'If the email exists, a reset link has been sent.');
        return;
      }
      window.location.href = '/account/orders';
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={isCompactEntry ? 'account-form account-email-form' : 'account-form'} onSubmit={handleSubmit}>
      {isCompactEntry ? (
        <label className="account-email-field">
          <span className="sr-only">Email</span>
          <input name="email" type="email" placeholder="Enter your email" autoComplete="email" required />
        </label>
      ) : (
        mode !== 'reset' && (
          <label>
            Email
            <input name="email" type="email" placeholder="name@company.com" autoComplete="email" required />
          </label>
        )
      )}
      {requiresPassword && (
        <label className={isCompactEntry ? 'account-email-field' : undefined}>
          <span className={isCompactEntry ? 'sr-only' : undefined}>Password</span>
          <input
            name="password"
            type="password"
            placeholder={mode === 'login' ? 'Enter your password' : 'Set your password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
          />
        </label>
      )}
      {(mode === 'register' || mode === 'reset') && (
        <label className={isCompactEntry ? 'account-email-field' : undefined}>
          <span className={isCompactEntry ? 'sr-only' : undefined}>Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
      )}
      <button className={isCompactEntry ? 'account-email-submit' : 'button primary account-submit'} disabled={busy} type="submit">
        {busy ? 'Processing...' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Set password'}
      </button>
      {isCompactEntry && (
        <p className="account-legal">Use the same email from checkout to view matching orders in your customer center.</p>
      )}
      {status && <p className="account-status">{status}</p>}
    </form>
  );
}

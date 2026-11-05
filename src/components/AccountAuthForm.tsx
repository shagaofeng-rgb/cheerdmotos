'use client';

import {useState} from 'react';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

export default function AccountAuthForm({mode, token = ''}: {mode: Mode; token?: string}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
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
    } catch {
      setStatus('We could not complete your request. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form sf-spaced" onSubmit={handleSubmit}>
      {mode !== 'reset' && <label className="field">Email address<input name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></label>}
      {requiresPassword && <label className="field">{mode === 'login' ? 'Password' : 'New password'}
        <input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required />
      </label>}
      {(mode === 'register' || mode === 'reset') && <label className="field">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>}
      <button className="button primary" disabled={busy} type="submit">{busy ? 'Processing…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Set password'}</button>
      {status && <p className="note" role="status">{status}</p>}
    </form>
  );
}

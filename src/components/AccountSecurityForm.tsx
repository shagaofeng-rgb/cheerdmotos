'use client';

import {useState} from 'react';

export default function AccountSecurityForm() {
  const [status, setStatus] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Saving...');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/account/change-password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    const result = await response.json().catch(() => ({}));
    setStatus(response.ok ? 'Password changed.' : result.message || 'Password update failed.');
    if (response.ok) event.currentTarget.reset();
  }

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <label>
        Current password
        <input name="currentPassword" type="password" required />
      </label>
      <label>
        New password
        <input name="newPassword" type="password" minLength={8} required />
      </label>
      <button className="button primary" type="submit">Change password</button>
      {status && <p className="account-status">{status}</p>}
    </form>
  );
}

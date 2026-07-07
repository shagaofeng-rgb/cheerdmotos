'use client';

import {useState} from 'react';

export default function AccountProfileForm({
  firstName,
  lastName,
  country
}: {
  firstName: string;
  lastName: string;
  country: string;
}) {
  const [status, setStatus] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Saving...');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    const result = await response.json().catch(() => ({}));
    setStatus(response.ok ? 'Profile updated.' : result.message || 'Profile update failed.');
  }

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <div className="account-form-grid">
        <label>
          First name
          <input name="firstName" defaultValue={firstName} />
        </label>
        <label>
          Last name
          <input name="lastName" defaultValue={lastName} />
        </label>
      </div>
      <label>
        Country / region
        <input name="country" defaultValue={country} />
      </label>
      <button className="button primary" type="submit">Save profile</button>
      {status && <p className="account-status">{status}</p>}
    </form>
  );
}

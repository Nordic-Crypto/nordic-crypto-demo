import { FormEvent, useState } from 'react';
import type { InviteCreatedResponse, MeResponse } from '@bastion/shared';
import { api, errorMessage } from '../api/client';
import { addPasskey, passkeysSupported } from '../api/passkeys';
import { FormError } from './AuthLayout';
import { ShieldIcon } from './ShieldIcon';

/**
 * Signed-in landing page. The chat itself arrives in stage 3; for now this
 * shows the account's security status, passkeys and (for admins) invitations.
 */
export function HomePage({
  me,
  onChanged,
  onSignOut,
}: {
  me: MeResponse;
  onChanged: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="home">
      <header className="home__bar">
        <div className="brand">
          <span className="brand__mark">
            <ShieldIcon />
          </span>
          <span className="brand__name brand__name--dark">Bastion</span>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      <main className="home__main">
        <h1>Welcome, {me.user.displayName}</h1>
        <p className="muted">
          Signed in as {me.user.email}
          {me.user.role === 'admin' ? ' · admin' : ''}. Chats arrive in the next update.
        </p>

        <section className="panel">
          <h2>Sign-in security</h2>
          <ul className="status-list">
            <li>
              <span className={me.mfa.totp ? 'pill pill--ok' : 'pill'}>{me.mfa.totp ? 'On' : 'Off'}</span>
              Authenticator app
            </li>
            <li>
              <span className={me.mfa.passkeys > 0 ? 'pill pill--ok' : 'pill'}>{me.mfa.passkeys}</span>
              Passkeys
            </li>
            <li>
              <span className={me.mfa.recoveryCodesLeft > 2 ? 'pill pill--ok' : 'pill pill--warn'}>
                {me.mfa.recoveryCodesLeft}
              </span>
              Recovery codes left
            </li>
          </ul>
          {passkeysSupported() && <AddPasskey onAdded={onChanged} />}
        </section>

        {me.user.role === 'admin' && <InvitePanel />}
      </main>
    </div>
  );
}

function AddPasskey({ onAdded }: { onAdded: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await addPasskey(guessDeviceName());
      setMessage('Passkey added. Next time you can sign in with your fingerprint, face or device PIN.');
      onAdded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void add()}>
        Add a passkey on this device
      </button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <FormError message={error} />
    </div>
  );
}

function InvitePanel() {
  const [link, setLink] = useState<InviteCreatedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setLink(null);
    try {
      setLink(
        await api<InviteCreatedResponse>('/auth/invites', {
          method: 'POST',
          body: { email: String(form.get('email') ?? ''), role: String(form.get('role') ?? 'member') },
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Invite a colleague</h2>
      <form className="invite-form" onSubmit={(e) => void onSubmit(e)}>
        <label className="field">
          Email
          <input type="email" name="email" required autoComplete="off" />
        </label>
        <label className="field">
          Role
          <select name="role" defaultValue="member">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Create invitation link
        </button>
      </form>
      <FormError message={error} />
      {link && (
        <div className="notice" role="status">
          <p>Send this link privately. It works once and expires {new Date(link.expiresAt).toLocaleString()}.</p>
          <code className="secret">{link.url}</code>
        </div>
      )}
    </section>
  );
}

function guessDeviceName(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android device';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  return 'Passkey';
}

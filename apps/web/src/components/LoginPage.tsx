import { FormEvent, useState } from 'react';
import { LIMITS, type LoginResponse } from '@bastion/shared';
import { api, errorMessage } from '../api/client';
import { passkeysSupported, signInWithPasskey } from '../api/passkeys';
import { AuthLayout, FormError } from './AuthLayout';
import { KeyIcon, LockIcon } from './ShieldIcon';

export function LoginPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSignedIn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void run(() =>
      api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') },
      }),
    );
  }

  return (
    <AuthLayout>
      <form className="card" onSubmit={onSubmit}>
        <div className="card__head">
          <h1>Sign in</h1>
          <p className="muted">Sign in to pick up where your team left off</p>
        </div>

        {passkeysSupported() && (
          <>
            <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void run(signInWithPasskey)}>
              <KeyIcon />
              Sign in with a passkey
            </button>
            <div className="divider">or</div>
          </>
        )}

        <label className="field">
          Work email
          <input type="email" name="email" autoComplete="username" required maxLength={LIMITS.maxEmailLength} />
        </label>

        <label className="field">
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={LIMITS.maxPasswordLength}
          />
        </label>

        <FormError message={error} />

        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Continue'}
        </button>

        <div className="hint">
          <LockIcon />
          <span>
            After your password we&apos;ll ask for a code from your authenticator app. Sign-in is paused
            for 15 minutes after 5 failed attempts.
          </span>
        </div>

        <p className="muted small center">No account? Ask your admin for an invitation link.</p>
      </form>
    </AuthLayout>
  );
}

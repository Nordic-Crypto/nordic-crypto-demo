import { FormEvent, useState } from 'react';
import type { LoginResponse, MeResponse } from '@bastion/shared';
import { api, errorMessage } from '../api/client';
import { passkeysSupported, signInWithPasskey } from '../api/passkeys';
import { AuthLayout, FormError } from './AuthLayout';
import { KeyIcon } from './ShieldIcon';

/** Second step of sign-in: authenticator code, recovery code or passkey. */
export function MfaChallengePage({
  me,
  onVerified,
  onSignOut,
}: {
  me: MeResponse;
  onVerified: () => void;
  onSignOut: () => void;
}) {
  const [useRecovery, setUseRecovery] = useState(!me.mfa.totp);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onVerified();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '').trim();
    void run(() =>
      useRecovery
        ? api<LoginResponse>('/auth/login/recovery', { method: 'POST', body: { code } })
        : api<LoginResponse>('/auth/login/totp', { method: 'POST', body: { code: code.replace(/\s/g, '') } }),
    );
  }

  return (
    <AuthLayout>
      <form className="card" onSubmit={onSubmit}>
        <div className="card__head">
          <h1>Confirm it&apos;s you</h1>
          <p className="muted">
            {useRecovery
              ? 'Enter one of your recovery codes. Each code works only once.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>
        </div>

        <label className="field">
          {useRecovery ? 'Recovery code' : '6-digit code'}
          {useRecovery ? (
            <input key="recovery" name="code" autoComplete="off" autoCapitalize="characters" maxLength={32} required />
          ) : (
            <input
              key="totp"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
            />
          )}
        </label>
        <FormError message={error} />
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Checking…' : 'Verify'}
        </button>

        {me.mfa.passkeys > 0 && passkeysSupported() && (
          <button type="button" className="btn btn--outline" disabled={busy} onClick={() => void run(signInWithPasskey)}>
            <KeyIcon />
            Use a passkey instead
          </button>
        )}
        {me.mfa.totp && (
          <button type="button" className="link-button" onClick={() => setUseRecovery((v) => !v)}>
            {useRecovery ? 'Use authenticator app' : 'Lost your phone? Use a recovery code'}
          </button>
        )}
        <button type="button" className="link-button" onClick={onSignOut}>
          Cancel and sign out
        </button>
      </form>
    </AuthLayout>
  );
}

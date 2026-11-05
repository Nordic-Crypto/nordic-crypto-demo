import { FormEvent, useEffect, useState } from 'react';
import { LIMITS, type InviteInfoResponse, type LoginResponse } from '@bastion/shared';
import { api, errorMessage } from '../api/client';
import { AuthLayout, FormError } from './AuthLayout';

/** Opened from an invitation link: /invite/<token>. */
export function RegisterPage({ token, onRegistered }: { token: string; onRegistered: () => void }) {
  const [invite, setInvite] = useState<InviteInfoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<InviteInfoResponse>(`/auth/invites/${encodeURIComponent(token)}`)
      .then((info) => {
        if (!cancelled) setInvite(info);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const chosen = String(form.get('password') ?? '');
    if (chosen !== String(form.get('confirm') ?? '')) {
      setError('The two passwords don’t match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api<LoginResponse>('/auth/register', {
        method: 'POST',
        body: { token, displayName: String(form.get('displayName') ?? ''), password: chosen },
      });
      // Remove the one-time token from the address bar and browser history.
      window.history.replaceState(null, '', '/');
      onRegistered();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <form className="card" onSubmit={(e) => void onSubmit(e)}>
        <div className="card__head">
          <h1>Join your team</h1>
          {invite && (
            <p className="muted">
              Invitation for <strong>{invite.email}</strong>
            </p>
          )}
        </div>

        {loadError ? (
          <FormError message={loadError} />
        ) : (
          <>
            <label className="field">
              Your name
              <input name="displayName" autoComplete="name" required maxLength={LIMITS.maxDisplayNameLength} />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={LIMITS.minPasswordLength}
                maxLength={LIMITS.maxPasswordLength}
                aria-describedby="pw-hint"
              />
            </label>
            <p id="pw-hint" className="muted small">
              At least {LIMITS.minPasswordLength} characters. A short sentence is easy to remember and hard to guess.
            </p>
            <label className="field">
              Repeat password
              <input type="password" name="confirm" autoComplete="new-password" required />
            </label>
            <FormError message={error} />
            <button type="submit" className="btn btn--primary" disabled={busy || !invite}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}

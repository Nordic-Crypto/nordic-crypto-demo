import { FormEvent, useEffect, useRef, useState } from 'react';
import type { TotpEnableResponse, TotpSetupResponse } from '@bastion/shared';
import { toDataURL } from 'qrcode';
import { api, errorMessage } from '../api/client';
import { AuthLayout, FormError } from './AuthLayout';
import { RecoveryCodes } from './RecoveryCodes';

/** Mandatory second step after registration: connect an authenticator app. */
export function TotpSetupPage({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Run once, even under React StrictMode's double effects in development.
    if (started.current) return;
    started.current = true;
    api<TotpSetupResponse>('/auth/totp/setup', { method: 'POST' })
      .then(async (s) => {
        setSetup(s);
        setQr(await toDataURL(s.otpauthUri, { margin: 1, width: 208, errorCorrectionLevel: 'M' }));
      })
      .catch((err: unknown) => setError(errorMessage(err)));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '').replace(/\s/g, '');
    setBusy(true);
    setError(null);
    try {
      const res = await api<TotpEnableResponse>('/auth/totp/enable', { method: 'POST', body: { code } });
      setCodes(res.recoveryCodes);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (codes) {
    return (
      <AuthLayout>
        <div className="card">
          <div className="card__head">
            <h1>Save your recovery codes</h1>
            <p className="muted">
              If you lose your phone, each code lets you sign in once. Store them somewhere safe, like a
              password manager. They won&apos;t be shown again.
            </p>
          </div>
          <RecoveryCodes codes={codes} />
          <button type="button" className="btn btn--primary" onClick={onDone}>
            I&apos;ve saved them — continue
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="card" onSubmit={(e) => void onSubmit(e)}>
        <div className="card__head">
          <h1>Protect your account</h1>
          <p className="muted">
            Scan this QR code with an authenticator app (Google Authenticator, Microsoft Authenticator,
            1Password, Aegis…), then enter the 6-digit code it shows.
          </p>
        </div>

        <div className="qr">
          {qr ? <img src={qr} width={208} height={208} alt="QR code for your authenticator app" /> : <span className="muted">Loading…</span>}
        </div>
        {setup && (
          <details className="small">
            <summary>Can&apos;t scan? Enter this key manually</summary>
            <code className="secret">{setup.secret}</code>
          </details>
        )}

        <label className="field">
          6-digit code
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
          />
        </label>
        <FormError message={error} />
        <button type="submit" className="btn btn--primary" disabled={busy || !setup}>
          {busy ? 'Checking…' : 'Turn on two-factor sign-in'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onSignOut}>
          Sign out
        </button>
      </form>
    </AuthLayout>
  );
}

import { useCallback, useEffect, useState } from 'react';
import type { MeResponse } from '@bastion/shared';
import { api, ApiRequestError } from './api/client';
import { HomePage } from './components/HomePage';
import { LoginPage } from './components/LoginPage';
import { MfaChallengePage } from './components/MfaChallengePage';
import { NetworkBanner } from './components/NetworkBanner';
import { RegisterPage } from './components/RegisterPage';
import { TotpSetupPage } from './components/TotpSetupPage';
import { UpdatePrompt } from './components/UpdatePrompt';

type View =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'signed_out' }
  | { kind: 'register'; token: string }
  | { kind: 'mfa_setup' }
  | { kind: 'mfa_pending'; me: MeResponse }
  | { kind: 'home'; me: MeResponse };

/** Invitation links look like /invite/<token>. */
export function inviteTokenFromPath(pathname: string): string | null {
  return /^\/invite\/([A-Za-z0-9_-]{32,64})\/?$/.exec(pathname)?.[1] ?? null;
}

export function App() {
  const [view, setView] = useState<View>({ kind: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const me = await api<MeResponse>('/auth/me');
      if (me.level === 'full') setView({ kind: 'home', me });
      else if (me.level === 'mfa_setup') setView({ kind: 'mfa_setup' });
      else setView({ kind: 'mfa_pending', me });
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        const token = inviteTokenFromPath(window.location.pathname);
        setView(token ? { kind: 'register', token } : { kind: 'signed_out' });
      } else {
        setView({ kind: 'error' });
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } finally {
      setView({ kind: 'signed_out' });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <NetworkBanner />
      {renderView(view, () => void refresh(), () => void signOut())}
      <UpdatePrompt />
    </>
  );
}

function renderView(view: View, refresh: () => void, signOut: () => void) {
  switch (view.kind) {
    case 'loading':
      return (
        <p className="splash" aria-live="polite">
          Loading…
        </p>
      );
    case 'error':
      return (
        <div className="splash">
          <p>Can&apos;t reach the server right now.</p>
          <button type="button" className="btn btn--primary" onClick={refresh}>
            Try again
          </button>
        </div>
      );
    case 'signed_out':
      return <LoginPage onSignedIn={refresh} />;
    case 'register':
      return <RegisterPage token={view.token} onRegistered={refresh} />;
    case 'mfa_setup':
      return <TotpSetupPage onDone={refresh} onSignOut={signOut} />;
    case 'mfa_pending':
      return <MfaChallengePage me={view.me} onVerified={refresh} onSignOut={signOut} />;
    case 'home':
      return <HomePage me={view.me} onChanged={refresh} onSignOut={signOut} />;
  }
}

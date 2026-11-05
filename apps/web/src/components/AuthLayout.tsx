import type { ReactNode } from 'react';
import { ServerStatus } from './ServerStatus';
import { CheckIcon, ShieldIcon } from './ShieldIcon';

const FEATURES = [
  'Encrypted connections and protected data storage',
  'Two-factor sign-in and control over all your devices',
  'Runs in your browser — nothing to download',
];

/** Two-column layout shared by all sign-in screens. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="login">
      <section className="login__brand">
        <div className="brand">
          <span className="brand__mark">
            <ShieldIcon />
          </span>
          <span className="brand__name">Bastion</span>
        </div>
        <div className="login__pitch">
          <h2>Team chat where conversations stay inside the team</h2>
          <ul>
            {FEATURES.map((f) => (
              <li key={f}>
                <span className="login__check">
                  <CheckIcon />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <ServerStatus />
      </section>
      <section className="login__panel">{children}</section>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

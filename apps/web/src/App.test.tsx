import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MeResponse } from '@bastion/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, inviteTokenFromPath } from './App';

type Route = { status: number; body?: unknown };

/** Fake API: answers by "METHOD /path". Unlisted requests fail like a network error. */
function mockApi(routes: Record<string, Route>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const key = `${init?.method ?? 'GET'} ${url}`;
    const route = routes[key];
    if (!route) throw new TypeError(`no mock for ${key}`);
    return new Response(route.body === undefined ? null : JSON.stringify(route.body), {
      status: route.status,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const unauthorized: Route = { status: 401, body: { error: { code: 'unauthorized', message: 'x' } } };
const live: Route = { status: 200, body: { status: 'ok' } };

const me = (level: MeResponse['level'], role: 'admin' | 'member' = 'member'): Route => ({
  status: 200,
  body: {
    user: { id: 'u1', email: 'anna@company.com', displayName: 'Anna', role },
    level,
    mfa: { totp: true, passkeys: 0, recoveryCodesLeft: 10 },
  } satisfies MeResponse,
});

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('shows the sign-in screen when not signed in', async () => {
    mockApi({ 'GET /api/auth/me': unauthorized, 'GET /api/health/live': live });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(await screen.findByText('Server online')).toBeInTheDocument();
  });

  it('signs in with email and password, then asks for the second factor', async () => {
    mockApi({
      'GET /api/auth/me': unauthorized,
      'GET /api/health/live': live,
      'POST /api/auth/login': { status: 200, body: { level: 'mfa_pending' } },
    });
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Work email'), { target: { value: 'anna@company.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-very-long-passphrase' } });

    mockApi({
      'GET /api/auth/me': me('mfa_pending'),
      'GET /api/health/live': live,
      'POST /api/auth/login': { status: 200, body: { level: 'mfa_pending' } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: "Confirm it's you" })).toBeInTheDocument();
    expect(screen.getByLabelText('6-digit code')).toHaveAttribute('autocomplete', 'one-time-code');
  });

  it('shows a safe error message when the password is wrong', async () => {
    mockApi({
      'GET /api/auth/me': unauthorized,
      'GET /api/health/live': live,
      'POST /api/auth/login': unauthorized,
    });
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Work email'), { target: { value: 'anna@company.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That didn’t work');
  });

  it('opens registration from an invitation link', async () => {
    const token = 'A'.repeat(43);
    window.history.replaceState(null, '', `/invite/${token}`);
    mockApi({
      'GET /api/auth/me': unauthorized,
      'GET /api/health/live': live,
      [`GET /api/auth/invites/${token}`]: {
        status: 200,
        body: { email: 'a***a@company.com', expiresAt: new Date().toISOString() },
      },
    });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Join your team' })).toBeInTheDocument();
    expect(await screen.findByText('a***a@company.com')).toBeInTheDocument();
  });

  it('shows the home page with the invite panel for admins', async () => {
    mockApi({ 'GET /api/auth/me': me('full', 'admin') });
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Welcome, Anna' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Invite a colleague' })).toBeInTheDocument();
  });

  it('hides the invite panel from members', async () => {
    mockApi({ 'GET /api/auth/me': me('full', 'member') });
    render(<App />);
    await screen.findByRole('heading', { name: 'Welcome, Anna' });
    expect(screen.queryByRole('heading', { name: 'Invite a colleague' })).not.toBeInTheDocument();
  });

  it('shows an offline banner when the network drops', async () => {
    mockApi({ 'GET /api/auth/me': unauthorized, 'GET /api/health/live': live });
    render(<App />);
    await screen.findByRole('heading', { name: 'Sign in' });
    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });
});

describe('inviteTokenFromPath', () => {
  it('accepts well-formed invitation paths only', () => {
    const t = 'abcDEF123_-'.padEnd(43, 'x');
    expect(inviteTokenFromPath(`/invite/${t}`)).toBe(t);
    expect(inviteTokenFromPath('/invite/short')).toBeNull();
    expect(inviteTokenFromPath(`/invite/${t}/../admin`)).toBeNull();
    expect(inviteTokenFromPath('/')).toBeNull();
  });
});

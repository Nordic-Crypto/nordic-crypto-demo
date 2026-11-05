import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomToken, sha256 } from '../../common/crypto';
import { runMigrations } from '../../infrastructure/database/migrate';
import {
  createIntegrationApp,
  HAS_INTEGRATION_ENV,
  resetState,
  TEST_DATABASE_URL,
} from '../../test/create-integration-app';
import { TEST_ORIGIN } from '../../test/create-test-app';
import { AuthRepository } from './auth.repository';
import { SESSION_COOKIE } from './session.service';
import { TotpService } from './totp.service';

type InjectResponse = Awaited<ReturnType<NestFastifyApplication['inject']>>;

const PASSWORD = 'a-very-long-passphrase';
const totp = new TotpService();

function sessionCookie(res: InjectResponse): string {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  const cookie = list.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) throw new Error('no session cookie in response');
  return cookie;
}

const cookiePair = (setCookie: string) => setCookie.split(';')[0] ?? '';

(HAS_INTEGRATION_ENV ? describe : describe.skip)('auth (real PostgreSQL + Redis)', () => {
  let app: NestFastifyApplication;
  let repo: AuthRepository;

  beforeAll(async () => {
    await runMigrations(TEST_DATABASE_URL);
    app = await createIntegrationApp();
    repo = app.get(AuthRepository);
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(async () => {
    await resetState(app);
  });

  const post = (url: string, payload?: unknown, cookie?: string) =>
    app.inject({
      method: 'POST',
      url,
      headers: {
        origin: TEST_ORIGIN,
        ...(cookie ? { cookie } : {}),
        ...(payload !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(payload !== undefined ? { payload: JSON.stringify(payload) } : {}),
    });
  const get = (url: string, cookie?: string) =>
    app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} });

  async function invite(email: string, role: 'admin' | 'member' = 'member'): Promise<string> {
    const token = randomToken(32);
    await repo.createInvite({
      tokenHash: sha256(token),
      email,
      role,
      createdBy: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    return token;
  }

  /** Registers via invite and finishes 2FA setup; returns a full-session cookie. */
  async function onboard(email: string, role: 'admin' | 'member' = 'member') {
    const token = await invite(email, role);
    let res = await post('/api/auth/register', { token, displayName: 'Test User', password: PASSWORD });
    expect(res.statusCode).toBe(200);
    let cookie = cookiePair(sessionCookie(res));

    res = await post('/api/auth/totp/setup', undefined, cookie);
    expect(res.statusCode).toBe(200);
    const { secret } = res.json() as { secret: string };

    const now = Date.now();
    res = await post('/api/auth/totp/enable', { code: totp.generate(secret, now) }, cookie);
    expect(res.statusCode).toBe(200);
    const { recoveryCodes } = res.json() as { recoveryCodes: string[] };
    cookie = cookiePair(sessionCookie(res));
    return { cookie, secret, recoveryCodes, enabledAt: now };
  }

  it('invite → register → 2FA → sign out → sign in with password and code', async () => {
    const token = await invite('anna@company.com', 'admin');

    let res = await get(`/api/auth/invites/${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ email: 'a***a@company.com' });

    res = await post('/api/auth/register', { token, displayName: 'Anna', password: PASSWORD });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ level: 'mfa_setup' });
    const setCookie = sessionCookie(res);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    let cookie = cookiePair(setCookie);

    // A half-signed-in session cannot use normal app routes.
    res = await post('/api/auth/invites', { email: 'x@company.com' }, cookie);
    expect(res.statusCode).toBe(403);

    res = await post('/api/auth/totp/setup', undefined, cookie);
    const { secret, otpauthUri } = res.json() as { secret: string; otpauthUri: string };
    expect(otpauthUri).toMatch(/^otpauth:\/\/totp\//);

    // Wrong code is refused.
    res = await post('/api/auth/totp/enable', { code: '000000' }, cookie);
    if (totp.verify(secret, '000000') === null) expect(res.statusCode).toBe(401);

    const now = Date.now();
    res = await post('/api/auth/totp/enable', { code: totp.generate(secret, now) }, cookie);
    expect(res.statusCode).toBe(200);
    expect((res.json() as { recoveryCodes: string[] }).recoveryCodes).toHaveLength(10);
    cookie = cookiePair(sessionCookie(res));

    res = await get('/api/auth/me', cookie);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ level: 'full', user: { email: 'anna@company.com', role: 'admin' } });

    res = await post('/api/auth/logout', undefined, cookie);
    expect(res.statusCode).toBe(204);
    res = await get('/api/auth/me', cookie);
    expect(res.statusCode).toBe(401);

    // Email is case-insensitive.
    res = await post('/api/auth/login', { email: 'ANNA@company.com', password: PASSWORD });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ level: 'mfa_pending' });
    cookie = cookiePair(sessionCookie(res));

    // The code already used during setup cannot be replayed.
    res = await post('/api/auth/login/totp', { code: totp.generate(secret, now) }, cookie);
    expect(res.statusCode).toBe(401);

    res = await post('/api/auth/login/totp', { code: totp.generate(secret, now + 30_000) }, cookie);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ level: 'full' });
    const fullCookie = cookiePair(sessionCookie(res));

    // The pre-2FA session id stopped working (no session fixation).
    expect((await get('/api/auth/me', cookie)).statusCode).toBe(401);
    expect((await get('/api/auth/me', fullCookie)).statusCode).toBe(200);
  });

  it('gives the same answer for unknown emails and wrong passwords', async () => {
    await onboard('ben@company.com');
    const unknown = await post('/api/auth/login', { email: 'nobody@company.com', password: PASSWORD });
    const wrong = await post('/api/auth/login', { email: 'ben@company.com', password: 'wrong-password-123' });
    expect(unknown.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(unknown.json().error.code).toBe(wrong.json().error.code);
  });

  it('locks the account after 5 wrong passwords', async () => {
    await onboard('carl@company.com');
    for (let i = 0; i < 5; i++) {
      const res = await post('/api/auth/login', { email: 'carl@company.com', password: `wrong-password-${i}` });
      expect(res.statusCode).toBe(401);
    }
    // Even the correct password is refused while locked.
    const res = await post('/api/auth/login', { email: 'carl@company.com', password: PASSWORD });
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('rate_limited');
  });

  it('invitations work exactly once', async () => {
    const token = await invite('dana@company.com');
    const body = { token, displayName: 'Dana', password: PASSWORD };
    expect((await post('/api/auth/register', body)).statusCode).toBe(200);
    expect((await post('/api/auth/register', body)).statusCode).toBe(404);
    expect((await get(`/api/auth/invites/${token}`)).statusCode).toBe(404);
    expect((await post('/api/auth/register', { ...body, token: randomToken(32) })).statusCode).toBe(404);
  });

  it('recovery codes work once each', async () => {
    const { cookie, recoveryCodes } = await onboard('eva@company.com');
    await post('/api/auth/logout', undefined, cookie);

    const code = (recoveryCodes[0] ?? '').toLowerCase(); // case is ignored
    let res = await post('/api/auth/login', { email: 'eva@company.com', password: PASSWORD });
    let pending = cookiePair(sessionCookie(res));
    res = await post('/api/auth/login/recovery', { code }, pending);
    expect(res.statusCode).toBe(200);

    res = await post('/api/auth/login', { email: 'eva@company.com', password: PASSWORD });
    pending = cookiePair(sessionCookie(res));
    res = await post('/api/auth/login/recovery', { code }, pending);
    expect(res.statusCode).toBe(401);
  });

  it('only admins can invite people', async () => {
    const admin = await onboard('fay@company.com', 'admin');
    const member = await onboard('gus@company.com', 'member');

    let res = await post('/api/auth/invites', { email: 'new@company.com' }, member.cookie);
    expect(res.statusCode).toBe(403);

    res = await post('/api/auth/invites', { email: 'new@company.com', role: 'member' }, admin.cookie);
    expect(res.statusCode).toBe(201);
    expect((res.json() as { url: string }).url).toMatch(/^https:\/\/chat\.test\/invite\/[A-Za-z0-9_-]{43}$/);

    res = await post('/api/auth/invites', { email: 'gus@company.com' }, admin.cookie);
    expect(res.statusCode).toBe(409);
  });

  it('rejects unknown fields in requests', async () => {
    const res = await post('/api/auth/login', { email: 'a@b.co', password: 'x', isAdmin: true });
    expect(res.statusCode).toBe(422);
  });
});

import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';
import { TotpService } from './totp.service';

describe('PasswordService (argon2id)', () => {
  const passwords = new PasswordService();

  it('hashes with argon2id and verifies', async () => {
    const h = await passwords.hash('correct horse battery staple');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect(h).not.toContain('correct horse');
    expect(await passwords.verify(h, 'correct horse battery staple')).toBe(true);
    expect(await passwords.verify(h, 'wrong password!!')).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await passwords.hash('same-password-123')).not.toBe(await passwords.hash('same-password-123'));
  });

  it('treats a malformed hash as a failed check, not a crash', async () => {
    expect(await passwords.verify('not-a-hash', 'whatever')).toBe(false);
  });

  it('dummy verification always fails', async () => {
    expect(await passwords.verifyDummy('anything')).toBe(false);
  });
});

describe('TotpService', () => {
  const totp = new TotpService();
  const secret = totp.generateSecret();
  const now = 1_800_000_000_000;

  it('accepts the current code and returns its time step', () => {
    const code = totp.generate(secret, now);
    expect(totp.verify(secret, code, now)).toBe(Math.floor(now / 30_000));
  });

  it('tolerates one period of clock drift, but not more', () => {
    expect(totp.verify(secret, totp.generate(secret, now - 30_000), now)).not.toBeNull();
    expect(totp.verify(secret, totp.generate(secret, now - 90_000), now)).toBeNull();
  });

  it('rejects a wrong code', () => {
    const code = totp.generate(secret, now);
    const wrong = code === '000000' ? '111111' : '000000';
    expect(totp.verify(secret, wrong, now)).toBeNull();
  });

  it('builds an otpauth URI for authenticator apps', () => {
    expect(totp.uri(secret, 'anna@company.com')).toMatch(/^otpauth:\/\/totp\/Bastion:anna%40company\.com\?/);
  });
});

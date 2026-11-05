import { describe, expect, it } from 'vitest';
import {
  DataCipher,
  generateRecoveryCodes,
  maskEmail,
  normalizeRecoveryCode,
  randomToken,
  safeEqual,
  sha256,
} from './crypto';

const key = Buffer.alloc(32, 7);

describe('DataCipher', () => {
  it('round-trips a secret', () => {
    const c = new DataCipher(key);
    const enc = c.encrypt('JBSWY3DPEHPK3PXP', 'user-1');
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(c.decrypt(enc, 'user-1')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('uses a fresh IV every time', () => {
    const c = new DataCipher(key);
    expect(c.encrypt('same', 'u')).not.toBe(c.encrypt('same', 'u'));
  });

  it('refuses to decrypt for another owner (AAD binding)', () => {
    const c = new DataCipher(key);
    const enc = c.encrypt('secret', 'user-1');
    expect(() => c.decrypt(enc, 'user-2')).toThrow();
  });

  it('detects tampering', () => {
    const c = new DataCipher(key);
    const parts = c.encrypt('secret', 'u').split('.');
    parts[2] = Buffer.from('tampered').toString('base64url');
    expect(() => c.decrypt(parts.join('.'), 'u')).toThrow();
  });

  it('rejects a key of the wrong size', () => {
    expect(() => new DataCipher(Buffer.alloc(16))).toThrow();
  });
});

describe('tokens and codes', () => {
  it('creates unique URL-safe tokens of 256 bits', () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(randomToken());
  });

  it('hashes deterministically', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('compares in constant time', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('generates 10 distinct, readable recovery codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  });

  it('normalises recovery codes typed by people', () => {
    expect(normalizeRecoveryCode(' k7m2q - xp9ta ')).toBe('K7M2QXP9TA');
  });

  it('masks emails', () => {
    expect(maskEmail('anna.keller@company.com')).toBe('a***r@company.com');
    expect(maskEmail('al@x.io')).toBe('a***@x.io');
  });
});

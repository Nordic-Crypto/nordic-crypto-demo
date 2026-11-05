import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const valid = {
  PUBLIC_ORIGIN: 'https://chat.example.com/',
  DATABASE_URL: 'postgres://bastion:secret-password@db:5432/bastion',
  REDIS_URL: 'redis://:secret@redis:6379',
  DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
};

describe('loadEnv', () => {
  it('parses a minimal valid config and normalises the origin', () => {
    const env = loadEnv(valid);
    expect(env.PUBLIC_ORIGIN).toBe('https://chat.example.com');
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_SSL).toBe(false);
    expect(env.DATA_ENCRYPTION_KEY).toHaveLength(32);
  });

  it('rejects an encryption key of the wrong length', () => {
    expect(() =>
      loadEnv({ ...valid, DATA_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') }),
    ).toThrow(/DATA_ENCRYPTION_KEY/);
  });

  it('fails closed when a required variable is missing', () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('never echoes secret values in the error message', () => {
    try {
      loadEnv({ ...valid, DATABASE_URL: 'mysql://user:topsecret@db/x' });
      expect.fail('should have thrown');
    } catch (e) {
      expect(String(e)).not.toContain('topsecret');
    }
  });
});

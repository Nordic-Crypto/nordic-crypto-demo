import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

/**
 * All configuration comes from environment variables (secrets are injected by
 * Docker secrets / the host, never committed). The process refuses to start if
 * anything is missing or malformed — failing closed beats running misconfigured.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /** The exact public origin of the app, e.g. https://chat.example.com. Used for Origin checks. */
  PUBLIC_ORIGIN: z
    .string()
    .url()
    .transform((u) => new URL(u).origin),

  /** Number of trusted reverse-proxy hops in front of the API (Caddy = 1). */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),

  DATABASE_URL: z
    .string()
    .url()
    .refine((u) => u.startsWith('postgres://') || u.startsWith('postgresql://'), {
      message: 'DATABASE_URL must be a postgres:// URL',
    }),
  /** Require TLS to Postgres (enable when the DB is not on the same private network). */
  DATABASE_SSL: booleanFromString.default(false),

  REDIS_URL: z
    .string()
    .url()
    .refine((u) => u.startsWith('redis://') || u.startsWith('rediss://'), {
      message: 'REDIS_URL must be a redis:// or rediss:// URL',
    }),

  /** 32 random bytes, base64. Encrypts secrets at rest (e.g. TOTP seeds). */
  DATA_ENCRYPTION_KEY: z
    .string()
    .transform((s) => Buffer.from(s, 'base64'))
    .refine((b) => b.length === 32, { message: 'DATA_ENCRYPTION_KEY must be 32 bytes, base64' }),

  /** Global per-IP request budget per minute (auth endpoints have stricter limits). */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).max(10_000).default(300),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    // Print only variable names and problems — never the values (they may be secrets).
    const problems = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');

/** WebAuthn relying-party id = the host name of the public origin. */
export function rpIdOf(env: Env): string {
  return new URL(env.PUBLIC_ORIGIN).hostname;
}

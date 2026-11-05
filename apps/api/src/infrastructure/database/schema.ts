import {
  bigint,
  index,
  inet,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Security audit log. Append-only by design: the application role gets
 * INSERT/SELECT only (see migrations), so a compromised app process cannot
 * rewrite history.
 *
 * Rule: `metadata` must never contain message text, passwords, tokens or file
 * contents — only identifiers and outcomes.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid('actor_user_id'),
    event: text('event').notNull(),
    outcome: text('outcome', { enum: ['success', 'failure', 'blocked'] }).notNull(),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, string | number | boolean | null>>(),
  },
  (t) => [
    index('audit_log_occurred_at_idx').on(t.occurredAt),
    index('audit_log_actor_idx').on(t.actorUserId, t.occurredAt),
  ],
);

/**
 * Accounts. Passwords are stored only as argon2id hashes; the TOTP secret is
 * encrypted with AES-256-GCM (key from DATA_ENCRYPTION_KEY, bound to the user id).
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
    totpSecretEnc: text('totp_secret_enc'),
    totpEnabledAt: timestamp('totp_enabled_at', { withTimezone: true }),
    /** Last accepted TOTP time step — a code can never be used twice (replay protection). */
    totpLastStep: bigint('totp_last_step', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
);

/** Single-use invitations. Only a SHA-256 hash of the token is stored. */
export const invites = pgTable(
  'invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    email: text('email').notNull(),
    role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('invites_token_hash_uq').on(t.tokenHash)],
);

/** One-time recovery codes for when the authenticator app is lost. Hashed. */
export const recoveryCodes = pgTable(
  'recovery_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('recovery_codes_user_idx').on(t.userId)],
);

/** WebAuthn passkeys. Only public keys are stored — never anything secret. */
export const passkeys = pgTable(
  'passkeys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull(),
    publicKey: text('public_key').notNull(),
    counter: bigint('counter', { mode: 'number' }).notNull().default(0),
    transports: jsonb('transports').$type<string[]>().notNull().default([]),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('passkeys_credential_id_uq').on(t.credentialId),
    index('passkeys_user_idx').on(t.userId),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type InviteRow = typeof invites.$inferSelect;
export type PasskeyRow = typeof passkeys.$inferSelect;

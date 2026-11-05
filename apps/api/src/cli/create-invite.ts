import { EmailSchema, UserRoleSchema } from '@bastion/shared';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';
import { randomToken, sha256 } from '../common/crypto';
import { auditLog, invites, users } from '../infrastructure/database/schema';
import { INVITE_TTL_MS, inviteUrl } from '../modules/auth/invite-link';

/**
 * Creates an invitation from the server's command line — this is how the very
 * first admin gets in:
 *
 *   docker compose run --rm api node dist/cli/create-invite.js you@company.com admin
 *
 * Prints a one-time link valid for 72 hours.
 */
async function main(): Promise<void> {
  const [emailArg, roleArg = 'member'] = process.argv.slice(2);
  const email = EmailSchema.safeParse(emailArg);
  const role = UserRoleSchema.safeParse(roleArg);
  if (!email.success || !role.success) {
    console.error('Usage: create-invite.js <email> [admin|member]');
    process.exit(2);
  }
  const env = z
    .object({ DATABASE_URL: z.string().url(), PUBLIC_ORIGIN: z.string().url() })
    .parse(process.env);

  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
  try {
    const db = drizzle(pool);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.data)).limit(1);
    if (existing) {
      console.error('A user with this email already exists.');
      process.exit(1);
    }
    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await db.insert(invites).values({
      tokenHash: sha256(token),
      email: email.data,
      role: role.data,
      createdBy: null,
      expiresAt,
    });
    await db.insert(auditLog).values({
      event: 'auth.invite.create',
      outcome: 'success',
      metadata: { role: role.data, source: 'cli' },
    });
    console.log(`Invitation for ${email.data} (${role.data}), valid until ${expiresAt.toISOString()}:`);
    console.log(inviteUrl(new URL(env.PUBLIC_ORIGIN).origin, token));
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('Failed:', err instanceof Error ? err.message : 'unknown error');
  process.exit(1);
});

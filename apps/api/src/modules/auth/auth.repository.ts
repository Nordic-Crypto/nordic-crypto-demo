import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { UserRole } from '@bastion/shared';
import { and, count, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { DB, Database } from '../../infrastructure/database/database.module';
import {
  invites,
  passkeys,
  recoveryCodes,
  users,
  type InviteRow,
  type PasskeyRow,
  type UserRow,
} from '../../infrastructure/database/schema';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === PG_UNIQUE_VIOLATION;
}

/** All database access for accounts, invites and second factors. Parameterised queries only. */
@Injectable()
export class AuthRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  // ---- Users ------------------------------------------------------------------

  async findUserByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row;
  }

  async findUserById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }

  // ---- Invites ----------------------------------------------------------------

  async createInvite(input: {
    tokenHash: string;
    email: string;
    role: UserRole;
    createdBy: string | null;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.insert(invites).values(input);
  }

  async findValidInvite(tokenHash: string): Promise<InviteRow | undefined> {
    const [row] = await this.db
      .select()
      .from(invites)
      .where(and(eq(invites.tokenHash, tokenHash), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
      .limit(1);
    return row;
  }

  /**
   * Atomically consumes a valid invite and creates the account it was issued
   * for. Returns undefined if the invite is unknown, used or expired.
   */
  async registerWithInvite(
    tokenHash: string,
    input: { displayName: string; passwordHash: string },
  ): Promise<UserRow | undefined> {
    try {
      return await this.db.transaction(async (tx) => {
        const [invite] = await tx
          .select()
          .from(invites)
          .where(
            and(eq(invites.tokenHash, tokenHash), isNull(invites.usedAt), gt(invites.expiresAt, new Date())),
          )
          .limit(1)
          .for('update');
        if (!invite) return undefined;

        const [user] = await tx
          .insert(users)
          .values({
            email: invite.email,
            displayName: input.displayName,
            passwordHash: input.passwordHash,
            role: invite.role,
          })
          .returning();
        await tx.update(invites).set({ usedAt: new Date() }).where(eq(invites.id, invite.id));
        return user;
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Account already exists');
      throw e;
    }
  }

  // ---- TOTP -------------------------------------------------------------------

  async setPendingTotpSecret(userId: string, secretEnc: string): Promise<void> {
    await this.db
      .update(users)
      .set({ totpSecretEnc: secretEnc, totpEnabledAt: null, totpLastStep: null })
      .where(and(eq(users.id, userId), isNull(users.totpEnabledAt)));
  }

  async enableTotp(userId: string, step: number): Promise<void> {
    await this.db
      .update(users)
      .set({ totpEnabledAt: new Date(), totpLastStep: step })
      .where(eq(users.id, userId));
  }

  /**
   * Records a used TOTP step, but only if it is newer than the last one.
   * Returns false for a replayed (already used) code. Atomic in SQL.
   */
  async consumeTotpStep(userId: string, step: number): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({ totpLastStep: step })
      .where(and(eq(users.id, userId), or(isNull(users.totpLastStep), lt(users.totpLastStep, step))))
      .returning({ id: users.id });
    return rows.length === 1;
  }

  // ---- Recovery codes ---------------------------------------------------------

  async replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
      await tx.insert(recoveryCodes).values(codeHashes.map((codeHash) => ({ userId, codeHash })));
    });
  }

  /** Marks a recovery code as used. Returns false if it does not exist or was used already. */
  async consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    const rows = await this.db
      .update(recoveryCodes)
      .set({ usedAt: new Date() })
      .where(
        and(eq(recoveryCodes.userId, userId), eq(recoveryCodes.codeHash, codeHash), isNull(recoveryCodes.usedAt)),
      )
      .returning({ id: recoveryCodes.id });
    return rows.length === 1;
  }

  async countUnusedRecoveryCodes(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(recoveryCodes)
      .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));
    return row?.n ?? 0;
  }

  // ---- Passkeys ---------------------------------------------------------------

  listPasskeys(userId: string): Promise<PasskeyRow[]> {
    return this.db.select().from(passkeys).where(eq(passkeys.userId, userId));
  }

  async countPasskeys(userId: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(passkeys).where(eq(passkeys.userId, userId));
    return row?.n ?? 0;
  }

  async findPasskeyByCredentialId(credentialId: string): Promise<PasskeyRow | undefined> {
    const [row] = await this.db.select().from(passkeys).where(eq(passkeys.credentialId, credentialId)).limit(1);
    return row;
  }

  async addPasskey(input: {
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string[];
    name: string;
  }): Promise<void> {
    try {
      await this.db.insert(passkeys).values(input);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Passkey already registered');
      throw e;
    }
  }

  async markPasskeyUsed(id: string, counter: number): Promise<void> {
    await this.db.update(passkeys).set({ counter, lastUsedAt: new Date() }).where(eq(passkeys.id, id));
  }
}

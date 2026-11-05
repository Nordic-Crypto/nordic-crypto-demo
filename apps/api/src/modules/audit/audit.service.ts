import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { DB, Database } from '../../infrastructure/database/database.module';
import { auditLog } from '../../infrastructure/database/schema';

export type AuditOutcome = 'success' | 'failure' | 'blocked';
export type AuditMetadata = Record<string, string | number | boolean | null>;

/**
 * Writes security events to the append-only audit log.
 * Never pass message text, passwords, codes or tokens in `metadata`.
 * Audit failures are logged but never break the user's request.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async record(
    event: string,
    outcome: AuditOutcome,
    ctx: { actorUserId?: string | null; req?: FastifyRequest; metadata?: AuditMetadata } = {},
  ): Promise<void> {
    try {
      await this.db.insert(auditLog).values({
        event,
        outcome,
        actorUserId: ctx.actorUserId ?? null,
        ip: ctx.req?.ip ?? null,
        userAgent: ctx.req?.headers['user-agent']?.slice(0, 256) ?? null,
        metadata: ctx.metadata ?? null,
      });
    } catch (e) {
      this.logger.error(`Failed to write audit event ${event}: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}

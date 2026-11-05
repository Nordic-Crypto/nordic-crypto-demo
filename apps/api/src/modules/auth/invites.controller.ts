import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CreateInviteRequestSchema,
  type CreateInviteRequest,
  type InviteCreatedResponse,
} from '@bastion/shared';
import type { FastifyRequest } from 'fastify';
import { randomToken, sha256 } from '../../common/crypto';
import { ZodBody } from '../../common/zod-body.pipe';
import { ENV, type Env } from '../../config/env';
import { AuditService } from '../audit/audit.service';
import { AuthRepository } from './auth.repository';
import { INVITE_TTL_MS, inviteUrl } from './invite-link';
import { CurrentAuth, SessionGuard, type AuthContext } from './session.guard';

@Controller('auth/invites')
@UseGuards(SessionGuard)
export class InvitesController {
  constructor(
    private readonly repo: AuthRepository,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Admins invite people by email. The link is valid for 72 hours and works once. */
  @Post()
  async create(
    @Body(new ZodBody(CreateInviteRequestSchema)) body: CreateInviteRequest,
    @CurrentAuth() auth: AuthContext,
    @Req() req: FastifyRequest,
  ): Promise<InviteCreatedResponse> {
    const me = await this.repo.findUserById(auth.userId);
    if (me?.role !== 'admin') {
      await this.audit.record('auth.invite.create', 'blocked', { actorUserId: auth.userId, req });
      throw new ForbiddenException();
    }
    if (await this.repo.findUserByEmail(body.email)) throw new ConflictException('Already a member');

    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await this.repo.createInvite({
      tokenHash: sha256(token),
      email: body.email,
      role: body.role,
      createdBy: auth.userId,
      expiresAt,
    });
    await this.audit.record('auth.invite.create', 'success', {
      actorUserId: auth.userId,
      req,
      metadata: { role: body.role },
    });
    return { url: inviteUrl(this.env.PUBLIC_ORIGIN, token), expiresAt: expiresAt.toISOString() };
  }
}

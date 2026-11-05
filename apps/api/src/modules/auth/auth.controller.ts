import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  InviteTokenSchema,
  LoginRequestSchema,
  RecoveryLoginRequestSchema,
  RegisterRequestSchema,
  TotpCodeRequestSchema,
  type InviteInfoResponse,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
  type RecoveryLoginRequest,
  type RegisterRequest,
  type TotpCodeRequest,
} from '@bastion/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DataCipher, maskEmail, normalizeRecoveryCode, sha256 } from '../../common/crypto';
import { ZodBody } from '../../common/zod-body.pipe';
import { AuditService } from '../audit/audit.service';
import { AuthRepository } from './auth.repository';
import { PasswordService } from './password.service';
import { AllowLevels, CurrentAuth, SessionGuard, type AuthContext } from './session.guard';
import {
  SessionService,
  clearSessionCookie,
  sessionIdFrom,
  setSessionCookie,
} from './session.service';
import { LoginThrottle } from './throttle.service';
import { TotpService } from './totp.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly repo: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly throttle: LoginThrottle,
    private readonly totp: TotpService,
    private readonly audit: AuditService,
    @Inject(DataCipher) private readonly cipher: DataCipher,
  ) {}

  /** Shows who an invitation is for (masked) before the person registers. */
  @Get('invites/:token')
  async inviteInfo(@Param('token') token: string): Promise<InviteInfoResponse> {
    if (!InviteTokenSchema.safeParse(token).success) throw new NotFoundException();
    const invite = await this.repo.findValidInvite(sha256(token));
    if (!invite) throw new NotFoundException();
    return { email: maskEmail(invite.email), expiresAt: invite.expiresAt.toISOString() };
  }

  /** Creates an account from a valid invitation. The user must then set up 2FA. */
  @Post('register')
  @HttpCode(200)
  async register(
    @Body(new ZodBody(RegisterRequestSchema)) body: RegisterRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponse> {
    await this.throttle.assertNotLocked('ip', req.ip);
    const passwordHash = await this.passwords.hash(body.password);
    const user = await this.repo.registerWithInvite(sha256(body.token), {
      displayName: body.displayName,
      passwordHash,
    });
    if (!user) {
      await this.throttle.fail('ip', req.ip);
      await this.audit.record('auth.register', 'failure', { req, metadata: { reason: 'invalid_invite' } });
      throw new NotFoundException();
    }
    await this.audit.record('auth.register', 'success', { actorUserId: user.id, req });
    const sid = await this.sessions.create(user.id, 'mfa_setup', req);
    setSessionCookie(reply, sid, 'mfa_setup');
    return { level: 'mfa_setup' };
  }

  /** Step 1: email + password. */
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodBody(LoginRequestSchema)) body: LoginRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponse> {
    await this.throttle.assertNotLocked('ip', req.ip);
    if (await this.throttle.isLocked('account', body.email)) {
      await this.audit.record('auth.login', 'blocked', { req, metadata: { reason: 'account_locked' } });
      await this.throttle.assertNotLocked('account', body.email);
    }

    const user = await this.repo.findUserByEmail(body.email);
    const ok =
      user && !user.disabledAt
        ? await this.passwords.verify(user.passwordHash, body.password)
        : await this.passwords.verifyDummy(body.password);

    if (!ok || !user) {
      await this.throttle.fail('ip', req.ip);
      const locked = await this.throttle.fail('account', body.email);
      await this.audit.record('auth.login', 'failure', {
        actorUserId: user?.id ?? null,
        req,
        metadata: { reason: 'bad_credentials', lockedNow: locked },
      });
      // Same answer whether the email exists or not.
      throw new UnauthorizedException();
    }

    await this.throttle.reset('account', body.email);
    const hasTotp = Boolean(user.totpEnabledAt);
    const passkeyCount = await this.repo.countPasskeys(user.id);
    const level = hasTotp || passkeyCount > 0 ? 'mfa_pending' : 'mfa_setup';

    // Replace any existing session from this browser.
    const existing = sessionIdFrom(req);
    if (existing) await this.sessions.destroy(existing);
    const sid = await this.sessions.create(user.id, level, req);
    setSessionCookie(reply, sid, level);
    await this.audit.record('auth.login.password', 'success', { actorUserId: user.id, req });
    return { level };
  }

  /** Step 2: code from the authenticator app. */
  @Post('login/totp')
  @HttpCode(200)
  @AllowLevels('mfa_pending')
  @UseGuards(SessionGuard)
  async loginTotp(
    @Body(new ZodBody(TotpCodeRequestSchema)) body: TotpCodeRequest,
    @CurrentAuth() auth: AuthContext,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponse> {
    await this.guardMfaAttempts(auth, reply);
    const user = await this.repo.findUserById(auth.userId);
    if (!user?.totpSecretEnc || !user.totpEnabledAt) throw new BadRequestException();

    const secret = this.cipher.decrypt(user.totpSecretEnc, user.id);
    const step = this.totp.verify(secret, body.code);
    if (step === null || !(await this.repo.consumeTotpStep(user.id, step))) {
      await this.mfaFailure(auth, req, 'totp');
    }

    return this.completeMfa(auth, req, reply, 'totp');
  }

  /** Step 2 (fallback): a one-time recovery code. */
  @Post('login/recovery')
  @HttpCode(200)
  @AllowLevels('mfa_pending')
  @UseGuards(SessionGuard)
  async loginRecovery(
    @Body(new ZodBody(RecoveryLoginRequestSchema)) body: RecoveryLoginRequest,
    @CurrentAuth() auth: AuthContext,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponse> {
    await this.guardMfaAttempts(auth, reply);
    const used = await this.repo.consumeRecoveryCode(auth.userId, sha256(normalizeRecoveryCode(body.code)));
    if (!used) await this.mfaFailure(auth, req, 'recovery');
    return this.completeMfa(auth, req, reply, 'recovery');
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    const id = sessionIdFrom(req);
    if (id) {
      const session = await this.sessions.get(id);
      if (session) {
        await this.sessions.destroyHash(session.hash, session.data.userId);
        await this.audit.record('auth.logout', 'success', { actorUserId: session.data.userId, req });
      }
    }
    clearSessionCookie(reply);
  }

  @Get('me')
  @AllowLevels('mfa_setup', 'mfa_pending', 'full')
  @UseGuards(SessionGuard)
  async me(@CurrentAuth() auth: AuthContext): Promise<MeResponse> {
    const user = await this.repo.findUserById(auth.userId);
    if (!user || user.disabledAt) throw new UnauthorizedException();
    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      level: auth.level,
      mfa: {
        totp: Boolean(user.totpEnabledAt),
        passkeys: await this.repo.countPasskeys(user.id),
        recoveryCodesLeft: await this.repo.countUnusedRecoveryCodes(user.id),
      },
    };
  }

  // ---- helpers ----------------------------------------------------------------

  /** After too many wrong codes the half-finished sign-in is thrown away. */
  private async guardMfaAttempts(auth: AuthContext, reply: FastifyReply): Promise<void> {
    if (await this.throttle.isLocked('mfa', auth.userId)) {
      await this.sessions.destroyHash(auth.session.hash, auth.userId);
      clearSessionCookie(reply);
      await this.throttle.assertNotLocked('mfa', auth.userId);
    }
  }

  private async mfaFailure(auth: AuthContext, req: FastifyRequest, method: string): Promise<never> {
    const locked = await this.throttle.fail('mfa', auth.userId);
    await this.audit.record('auth.login.mfa', 'failure', {
      actorUserId: auth.userId,
      req,
      metadata: { method, lockedNow: locked },
    });
    throw new UnauthorizedException();
  }

  private async completeMfa(
    auth: AuthContext,
    req: FastifyRequest,
    reply: FastifyReply,
    method: string,
  ): Promise<LoginResponse> {
    await this.throttle.reset('mfa', auth.userId);
    const sid = await this.sessions.upgrade(auth.session, 'full', req);
    setSessionCookie(reply, sid, 'full');
    await this.audit.record('auth.login.mfa', 'success', { actorUserId: auth.userId, req, metadata: { method } });
    return { level: 'full' };
  }
}

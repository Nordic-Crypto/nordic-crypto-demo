import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  TotpCodeRequestSchema,
  type TotpCodeRequest,
  type TotpEnableResponse,
  type TotpSetupResponse,
} from '@bastion/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DataCipher, generateRecoveryCodes, normalizeRecoveryCode, sha256 } from '../../common/crypto';
import { ZodBody } from '../../common/zod-body.pipe';
import { AuditService } from '../audit/audit.service';
import { AuthRepository } from './auth.repository';
import { AllowLevels, CurrentAuth, SessionGuard, type AuthContext } from './session.guard';
import { SessionService, setSessionCookie } from './session.service';
import { LoginThrottle } from './throttle.service';
import { TotpService } from './totp.service';

/** Setting up the authenticator app (second factor). */
@Controller('auth/totp')
@UseGuards(SessionGuard)
export class TotpController {
  constructor(
    private readonly repo: AuthRepository,
    private readonly totp: TotpService,
    private readonly sessions: SessionService,
    private readonly throttle: LoginThrottle,
    private readonly audit: AuditService,
    @Inject(DataCipher) private readonly cipher: DataCipher,
  ) {}

  /** Creates a new secret (not active until confirmed with a code). */
  @Post('setup')
  @HttpCode(200)
  @AllowLevels('mfa_setup', 'full')
  async setup(@CurrentAuth() auth: AuthContext): Promise<TotpSetupResponse> {
    const user = await this.repo.findUserById(auth.userId);
    if (!user) throw new UnauthorizedException();
    if (user.totpEnabledAt) throw new ConflictException('Authenticator already enabled');

    const secret = this.totp.generateSecret();
    await this.repo.setPendingTotpSecret(user.id, this.cipher.encrypt(secret, user.id));
    return { secret, otpauthUri: this.totp.uri(secret, user.email) };
  }

  /** Confirms the secret with a first code; returns one-time recovery codes. */
  @Post('enable')
  @HttpCode(200)
  @AllowLevels('mfa_setup', 'full')
  async enable(
    @Body(new ZodBody(TotpCodeRequestSchema)) body: TotpCodeRequest,
    @CurrentAuth() auth: AuthContext,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<TotpEnableResponse> {
    await this.throttle.assertNotLocked('mfa', auth.userId);
    const user = await this.repo.findUserById(auth.userId);
    if (!user) throw new UnauthorizedException();
    if (!user.totpSecretEnc || user.totpEnabledAt) throw new ConflictException();

    const step = this.totp.verify(this.cipher.decrypt(user.totpSecretEnc, user.id), body.code);
    if (step === null) {
      await this.throttle.fail('mfa', auth.userId);
      throw new UnauthorizedException();
    }

    await this.repo.enableTotp(user.id, step);
    const codes = generateRecoveryCodes();
    await this.repo.replaceRecoveryCodes(
      user.id,
      codes.map((c) => sha256(normalizeRecoveryCode(c))),
    );
    await this.throttle.reset('mfa', auth.userId);
    await this.audit.record('auth.totp.enable', 'success', { actorUserId: user.id, req });

    if (auth.level !== 'full') {
      const sid = await this.sessions.upgrade(auth.session, 'full', req);
      setSessionCookie(reply, sid, 'full');
    }
    return { recoveryCodes: codes };
  }
}

import {
  BadRequestException,
  Body,
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
  PasskeyLoginVerifyRequestSchema,
  PasskeyRegisterVerifyRequestSchema,
  type LoginResponse,
  type PasskeyLoginOptionsResponse,
  type PasskeyLoginVerifyRequest,
  type PasskeyRegisterVerifyRequest,
} from '@bastion/shared';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type Redis from 'ioredis';
import { randomToken } from '../../common/crypto';
import { ZodBody } from '../../common/zod-body.pipe';
import { ENV, rpIdOf, type Env } from '../../config/env';
import { REDIS } from '../../infrastructure/redis/redis.module';
import { AuditService } from '../audit/audit.service';
import { AuthRepository } from './auth.repository';
import { CurrentAuth, SessionGuard, type AuthContext } from './session.guard';
import { SessionService, sessionIdFrom, setSessionCookie } from './session.service';
import { LoginThrottle } from './throttle.service';

const CHALLENGE_TTL_SECONDS = 5 * 60;

/**
 * Passkeys (WebAuthn). Phishing-resistant: the browser only signs for our exact
 * domain, and user verification (fingerprint, face, PIN) is always required,
 * so a passkey counts as a complete two-factor sign-in.
 */
@Controller('auth/passkeys')
export class PasskeysController {
  constructor(
    private readonly repo: AuthRepository,
    private readonly sessions: SessionService,
    private readonly throttle: LoginThrottle,
    private readonly audit: AuditService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('register/options')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async registerOptions(@CurrentAuth() auth: AuthContext): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const user = await this.repo.findUserById(auth.userId);
    if (!user) throw new UnauthorizedException();
    const existing = await this.repo.listPasskeys(user.id);

    const options = await generateRegistrationOptions({
      rpName: 'Bastion',
      rpID: rpIdOf(this.env),
      userName: user.email,
      userDisplayName: user.displayName,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: existing.map((p) => ({
        id: p.credentialId,
        transports: p.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    });
    await this.redis.set(`wa:reg:${auth.session.hash}`, options.challenge, 'EX', CHALLENGE_TTL_SECONDS);
    return options;
  }

  @Post('register/verify')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async registerVerify(
    @Body(new ZodBody(PasskeyRegisterVerifyRequestSchema)) body: PasskeyRegisterVerifyRequest,
    @CurrentAuth() auth: AuthContext,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    const expectedChallenge = await this.redis.getdel(`wa:reg:${auth.session.hash}`);
    if (!expectedChallenge) throw new BadRequestException();

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response as unknown as RegistrationResponseJSON,
        expectedChallenge,
        expectedOrigin: this.env.PUBLIC_ORIGIN,
        expectedRPID: rpIdOf(this.env),
        requireUserVerification: true,
      });
    } catch {
      throw new BadRequestException();
    }
    if (!verification.verified || !verification.registrationInfo) throw new BadRequestException();

    const { credential } = verification.registrationInfo;
    await this.repo.addPasskey({
      userId: auth.userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: credential.transports ?? [],
      name: body.name ?? 'Passkey',
    });
    await this.audit.record('auth.passkey.add', 'success', { actorUserId: auth.userId, req });
  }

  /** Starts a passwordless sign-in. No account name needed (discoverable credentials). */
  @Post('login/options')
  @HttpCode(200)
  async loginOptions(@Req() req: FastifyRequest): Promise<PasskeyLoginOptionsResponse> {
    await this.throttle.assertNotLocked('ip', req.ip);
    const options = await generateAuthenticationOptions({
      rpID: rpIdOf(this.env),
      userVerification: 'required',
    });
    const flowId = randomToken(32);
    await this.redis.set(`wa:auth:${flowId}`, options.challenge, 'EX', CHALLENGE_TTL_SECONDS);
    return { flowId, options: options as unknown as Record<string, unknown> };
  }

  @Post('login/verify')
  @HttpCode(200)
  async loginVerify(
    @Body(new ZodBody(PasskeyLoginVerifyRequestSchema)) body: PasskeyLoginVerifyRequest,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LoginResponse> {
    await this.throttle.assertNotLocked('ip', req.ip);
    const expectedChallenge = await this.redis.getdel(`wa:auth:${body.flowId}`);
    const passkey = await this.repo.findPasskeyByCredentialId(body.response.id);
    if (!expectedChallenge || !passkey) return this.fail(req, null);

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.response as unknown as AuthenticationResponseJSON,
        expectedChallenge,
        expectedOrigin: this.env.PUBLIC_ORIGIN,
        expectedRPID: rpIdOf(this.env),
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(Buffer.from(passkey.publicKey, 'base64url')),
          counter: passkey.counter,
          transports: passkey.transports as AuthenticatorTransportFuture[],
        },
        requireUserVerification: true,
      });
    } catch {
      return this.fail(req, passkey.userId);
    }
    if (!verification.verified) return this.fail(req, passkey.userId);

    const user = await this.repo.findUserById(passkey.userId);
    if (!user || user.disabledAt) return this.fail(req, passkey.userId);

    await this.repo.markPasskeyUsed(passkey.id, verification.authenticationInfo.newCounter);
    const existing = sessionIdFrom(req);
    if (existing) await this.sessions.destroy(existing);
    const sid = await this.sessions.create(user.id, 'full', req);
    setSessionCookie(reply, sid, 'full');
    await this.audit.record('auth.login.passkey', 'success', { actorUserId: user.id, req });
    return { level: 'full' };
  }

  private async fail(req: FastifyRequest, userId: string | null): Promise<never> {
    await this.throttle.fail('ip', req.ip);
    await this.audit.record('auth.login.passkey', 'failure', { actorUserId: userId, req });
    throw new UnauthorizedException();
  }
}

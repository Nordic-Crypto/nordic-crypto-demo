import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionLevel } from '@bastion/shared';
import type { FastifyRequest } from 'fastify';
import { LoadedSession, SessionService, sessionIdFrom } from './session.service';

export interface AuthContext {
  userId: string;
  level: SessionLevel;
  session: LoadedSession;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

const ALLOWED_LEVELS = 'bastion:allowed-levels';

/**
 * Which session levels may call a route. Default (no decorator): 'full' only,
 * so a half-signed-in user can never reach normal app routes by accident.
 */
export const AllowLevels = (...levels: SessionLevel[]) => SetMetadata(ALLOWED_LEVELS, levels);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const id = sessionIdFrom(req);
    if (!id) throw new UnauthorizedException();
    const session = await this.sessions.get(id);
    if (!session) throw new UnauthorizedException();

    const allowed = this.reflector.getAllAndOverride<SessionLevel[] | undefined>(ALLOWED_LEVELS, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) ?? ['full'];
    if (!allowed.includes(session.data.level)) throw new ForbiddenException();

    req.auth = { userId: session.data.userId, level: session.data.level, session };
    return true;
  }
}

/** Injects the authenticated context into a route handler. */
export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest>();
  if (!req.auth) throw new UnauthorizedException();
  return req.auth;
});

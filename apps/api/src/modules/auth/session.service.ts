import { Inject, Injectable } from '@nestjs/common';
import type { SessionLevel } from '@bastion/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type Redis from 'ioredis';
import { z } from 'zod';
import { randomToken, sha256 } from '../../common/crypto';
import { REDIS } from '../../infrastructure/redis/redis.module';

/**
 * `__Host-` prefix: the browser only accepts the cookie over HTTPS, for this
 * exact host and path "/", so subdomains can never set or overwrite it.
 */
export const SESSION_COOKIE = '__Host-bastion_sid';

/** A half-finished sign-in (password ok, 2FA not yet) expires quickly. */
export const PARTIAL_TTL_SECONDS = 10 * 60;
/** A full session ends after 12 hours of inactivity… */
export const IDLE_TTL_SECONDS = 12 * 60 * 60;
/** …and after 7 days in any case. */
export const ABSOLUTE_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const SessionDataSchema = z.object({
  userId: z.string().uuid(),
  level: z.enum(['mfa_setup', 'mfa_pending', 'full']),
  createdAt: z.number(),
  lastSeenAt: z.number(),
  ip: z.string().max(64),
  userAgent: z.string().max(256),
});
export type SessionData = z.infer<typeof SessionDataSchema>;

export interface LoadedSession {
  /** SHA-256 of the session id — the only form ever stored server-side. */
  hash: string;
  data: SessionData;
}

const sessionKey = (hash: string) => `sess:${hash}`;
const userIndexKey = (userId: string) => `usess:${userId}`;

/**
 * Server-side sessions in Redis. The browser holds only a random 256-bit id in
 * an HttpOnly cookie; Redis holds only its hash, so a Redis dump cannot be used
 * to hijack sessions.
 */
@Injectable()
export class SessionService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async create(userId: string, level: SessionLevel, req: FastifyRequest): Promise<string> {
    const id = randomToken(32);
    const hash = sha256(id);
    const now = Date.now();
    await this.save(hash, {
      userId,
      level,
      createdAt: now,
      lastSeenAt: now,
      ip: req.ip.slice(0, 64),
      userAgent: (req.headers['user-agent'] ?? '').slice(0, 256),
    });
    await this.redis.sadd(userIndexKey(userId), hash);
    await this.redis.expire(userIndexKey(userId), ABSOLUTE_TTL_SECONDS);
    return id;
  }

  async get(id: string): Promise<LoadedSession | null> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(id)) return null;
    const hash = sha256(id);
    const raw = await this.redis.get(sessionKey(hash));
    if (!raw) return null;

    let data: SessionData;
    try {
      data = SessionDataSchema.parse(JSON.parse(raw));
    } catch {
      await this.destroyHash(hash);
      return null;
    }

    const now = Date.now();
    if (now - data.createdAt > ABSOLUTE_TTL_SECONDS * 1000) {
      await this.destroyHash(hash, data.userId);
      return null;
    }
    // Sliding expiry for full sessions, refreshed at most every few minutes.
    if (data.level === 'full' && now - data.lastSeenAt > TOUCH_INTERVAL_MS) {
      data = { ...data, lastSeenAt: now };
      await this.save(hash, data);
    }
    return { hash, data };
  }

  /**
   * Moves a user to a new level with a NEW session id (prevents session
   * fixation): the old id stops working immediately.
   */
  async upgrade(current: LoadedSession, level: SessionLevel, req: FastifyRequest): Promise<string> {
    await this.destroyHash(current.hash, current.data.userId);
    return this.create(current.data.userId, level, req);
  }

  async destroy(id: string): Promise<void> {
    const session = await this.get(id);
    if (session) await this.destroyHash(session.hash, session.data.userId);
  }

  async destroyHash(hash: string, userId?: string): Promise<void> {
    await this.redis.del(sessionKey(hash));
    if (userId) await this.redis.srem(userIndexKey(userId), hash);
  }

  /** Signs the user out everywhere (optionally keeping one session). */
  async destroyAllForUser(userId: string, exceptHash?: string): Promise<void> {
    const hashes = await this.redis.smembers(userIndexKey(userId));
    for (const h of hashes) {
      if (h !== exceptHash) await this.destroyHash(h, userId);
    }
  }

  private async save(hash: string, data: SessionData): Promise<void> {
    const ttl = data.level === 'full' ? IDLE_TTL_SECONDS : PARTIAL_TTL_SECONDS;
    await this.redis.set(sessionKey(hash), JSON.stringify(data), 'EX', ttl);
  }
}

const COOKIE_BASE = { path: '/', httpOnly: true, secure: true, sameSite: 'strict' } as const;

export function setSessionCookie(reply: FastifyReply, id: string, level: SessionLevel): void {
  reply.setCookie(SESSION_COOKIE, id, {
    ...COOKIE_BASE,
    maxAge: level === 'full' ? ABSOLUTE_TTL_SECONDS : PARTIAL_TTL_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, COOKIE_BASE);
}

export function sessionIdFrom(req: FastifyRequest): string | undefined {
  return req.cookies?.[SESSION_COOKIE];
}

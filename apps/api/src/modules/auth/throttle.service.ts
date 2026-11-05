import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { sha256 } from '../../common/crypto';
import { REDIS } from '../../infrastructure/redis/redis.module';

const WINDOW_SECONDS = 15 * 60;

/** Brute-force limits, all within a 15-minute window. */
export const THROTTLE_LIMITS = {
  /** Wrong passwords per account. */
  account: 5,
  /** Failed sign-ins per IP address (any account). */
  ip: 30,
  /** Wrong 2FA / recovery codes per account. */
  mfa: 5,
} as const;

export type ThrottleScope = keyof typeof THROTTLE_LIMITS;

/**
 * Counts failures in Redis. Once a limit is reached the key stays locked until
 * the window expires, so guessing is limited to a handful of tries per 15 min.
 */
@Injectable()
export class LoginThrottle {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /** Throws 429 if the key is locked. */
  async assertNotLocked(scope: ThrottleScope, id: string): Promise<void> {
    if (await this.isLocked(scope, id)) {
      throw new HttpException('Too many attempts', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async isLocked(scope: ThrottleScope, id: string): Promise<boolean> {
    const n = Number(await this.redis.get(this.key(scope, id)));
    return n >= THROTTLE_LIMITS[scope];
  }

  /** Records a failure; returns true if this failure triggered the lock. */
  async fail(scope: ThrottleScope, id: string): Promise<boolean> {
    const key = this.key(scope, id);
    const n = await this.redis.incr(key);
    if (n === 1) await this.redis.expire(key, WINDOW_SECONDS);
    return n === THROTTLE_LIMITS[scope];
  }

  async reset(scope: ThrottleScope, id: string): Promise<void> {
    await this.redis.del(this.key(scope, id));
  }

  private key(scope: ThrottleScope, id: string): string {
    // Hash identifiers so emails/IPs never appear in Redis keys.
    return `thr:${scope}:${sha256(id)}`;
  }
}

import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * argon2id (the library default) with OWASP-recommended parameters:
 * 19 MiB memory, 2 iterations, 1 lane.
 */
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

let dummyHash: Promise<string> | undefined;

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  /**
   * Spends the same time as a real check when the account does not exist,
   * so response timing does not reveal which emails are registered.
   */
  async verifyDummy(password: string): Promise<false> {
    dummyHash ??= hash('bastion-timing-equaliser', ARGON2_OPTIONS);
    await this.verify(await dummyHash, password);
    return false;
  }
}

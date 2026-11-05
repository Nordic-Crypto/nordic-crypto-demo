import { Injectable } from '@nestjs/common';
import * as OTPAuth from 'otpauth';

const PERIOD_SECONDS = 30;

/** RFC 6238 TOTP (the codes shown by Google Authenticator, 1Password, Aegis, …). */
@Injectable()
export class TotpService {
  /** New random 160-bit secret, base32-encoded. */
  generateSecret(): string {
    return new OTPAuth.Secret({ size: 20 }).base32;
  }

  /** otpauth:// URI for the QR code. */
  uri(secretBase32: string, accountLabel: string): string {
    return this.totp(secretBase32, accountLabel).toString();
  }

  /**
   * Checks a code, allowing ±1 period for clock drift.
   * Returns the absolute time step the code belongs to (so callers can block
   * reuse of the same code), or null if the code is wrong.
   */
  verify(secretBase32: string, code: string, now: number = Date.now()): number | null {
    const delta = this.totp(secretBase32, 'verify').validate({ token: code, timestamp: now, window: 1 });
    if (delta === null) return null;
    return Math.floor(now / 1000 / PERIOD_SECONDS) + delta;
  }

  /** Generates the code for a moment in time (used by tests). */
  generate(secretBase32: string, timestamp: number): string {
    return this.totp(secretBase32, 'generate').generate({ timestamp });
  }

  private totp(secretBase32: string, label: string): OTPAuth.TOTP {
    return new OTPAuth.TOTP({
      issuer: 'Bastion',
      label,
      algorithm: 'SHA1',
      digits: 6,
      period: PERIOD_SECONDS,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
  }
}

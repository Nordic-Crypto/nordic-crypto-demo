import { z } from 'zod';
import { LIMITS } from './limits.js';

/** Emails are compared case-insensitively, so they are always stored lower-case. */
export const EmailSchema = z.string().trim().toLowerCase().max(LIMITS.maxEmailLength).email();

export const PasswordSchema = z
  .string()
  .min(LIMITS.minPasswordLength)
  .max(LIMITS.maxPasswordLength);

export const DisplayNameSchema = z.string().trim().min(1).max(LIMITS.maxDisplayNameLength);

export const TotpCodeSchema = z.string().regex(/^\d{6}$/);

/** Recovery codes look like ABCDE-FGHIJ; spaces, dashes and case are ignored. */
export const RecoveryCodeSchema = z.string().trim().min(10).max(32);

export const InviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

export const UserRoleSchema = z.enum(['admin', 'member']);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * mfa_setup   — password accepted, a second factor must be set up first.
 * mfa_pending — password accepted, the second factor must be confirmed.
 * full        — fully signed in.
 */
export const SessionLevelSchema = z.enum(['mfa_setup', 'mfa_pending', 'full']);
export type SessionLevel = z.infer<typeof SessionLevelSchema>;

// ---- Requests ----------------------------------------------------------------

export const RegisterRequestSchema = z
  .object({ token: InviteTokenSchema, displayName: DisplayNameSchema, password: PasswordSchema })
  .strict();
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z
  .object({ email: EmailSchema, password: z.string().min(1).max(LIMITS.maxPasswordLength) })
  .strict();
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const TotpCodeRequestSchema = z.object({ code: TotpCodeSchema }).strict();
export type TotpCodeRequest = z.infer<typeof TotpCodeRequestSchema>;

export const RecoveryLoginRequestSchema = z.object({ code: RecoveryCodeSchema }).strict();
export type RecoveryLoginRequest = z.infer<typeof RecoveryLoginRequestSchema>;

export const CreateInviteRequestSchema = z
  .object({ email: EmailSchema, role: UserRoleSchema.default('member') })
  .strict();
export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;

/** A WebAuthn credential response as produced by @simplewebauthn/browser. */
export const WebAuthnResponseSchema = z.object({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal('public-key'),
  response: z.record(z.string(), z.unknown()),
  clientExtensionResults: z.record(z.string(), z.unknown()),
  authenticatorAttachment: z.string().max(32).optional(),
});

export const PasskeyRegisterVerifyRequestSchema = z
  .object({
    response: WebAuthnResponseSchema,
    name: z.string().trim().min(1).max(64).optional(),
  })
  .strict();
export type PasskeyRegisterVerifyRequest = z.infer<typeof PasskeyRegisterVerifyRequestSchema>;

export const PasskeyLoginVerifyRequestSchema = z
  .object({ flowId: z.string().regex(/^[A-Za-z0-9_-]{32,64}$/), response: WebAuthnResponseSchema })
  .strict();
export type PasskeyLoginVerifyRequest = z.infer<typeof PasskeyLoginVerifyRequestSchema>;

// ---- Responses ---------------------------------------------------------------

export interface MeResponse {
  user: { id: string; email: string; displayName: string; role: UserRole };
  level: SessionLevel;
  mfa: { totp: boolean; passkeys: number; recoveryCodesLeft: number };
}

export interface LoginResponse {
  level: SessionLevel;
}

export interface InviteInfoResponse {
  email: string;
  expiresAt: string;
}

export interface InviteCreatedResponse {
  url: string;
  expiresAt: string;
}

export interface TotpSetupResponse {
  secret: string;
  otpauthUri: string;
}

export interface TotpEnableResponse {
  recoveryCodes: string[];
}

export interface PasskeyLoginOptionsResponse {
  flowId: string;
  /** PublicKeyCredentialRequestOptionsJSON — passed straight to the browser API. */
  options: Record<string, unknown>;
}

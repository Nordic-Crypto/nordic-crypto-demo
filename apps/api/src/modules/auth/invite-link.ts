/** Invitations are valid for 72 hours and can be used once. */
export const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

/** Builds the link a person opens to register. Only the token's hash is stored. */
export function inviteUrl(origin: string, token: string): string {
  return `${origin}/invite/${token}`;
}

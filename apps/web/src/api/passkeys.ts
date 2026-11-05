import type { LoginResponse, PasskeyLoginOptionsResponse } from '@bastion/shared';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { api } from './client';

export const passkeysSupported = (): boolean => browserSupportsWebAuthn();

/** Passwordless sign-in: the browser shows the passkeys saved for this site. */
export async function signInWithPasskey(): Promise<LoginResponse> {
  const { flowId, options } = await api<PasskeyLoginOptionsResponse>('/auth/passkeys/login/options', {
    method: 'POST',
  });
  const response = await startAuthentication({
    optionsJSON: options as unknown as PublicKeyCredentialRequestOptionsJSON,
  });
  return api<LoginResponse>('/auth/passkeys/login/verify', { method: 'POST', body: { flowId, response } });
}

/** Adds a passkey (fingerprint, face, device PIN or security key) to the account. */
export async function addPasskey(name: string): Promise<void> {
  const options = await api<PublicKeyCredentialCreationOptionsJSON>('/auth/passkeys/register/options', {
    method: 'POST',
  });
  const response = await startRegistration({ optionsJSON: options });
  await api<void>('/auth/passkeys/register/verify', { method: 'POST', body: { response, name } });
}

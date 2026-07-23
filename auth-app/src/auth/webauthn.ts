/**
 * WebAuthn registration ceremony (D5 — PoC-optional on the backend).
 *
 * The browser owns the actual credential creation; this module only shapes the
 * `navigator.credentials.create({ publicKey })` call from the server-issued
 * options and normalizes the result for the mock verifier. Backend attestation
 * verification is mocked, so we hand the raw credential id back and let the
 * mock accept it.
 */

import type { PasskeyRegistrationOptions } from './api/authApi';

/** base64url string → ArrayBuffer (challenge + user.id arrive encoded). */
const fromB64url = (value: string): ArrayBuffer => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return bytes.buffer;
};

export interface PasskeyRegistrationResult {
  status: 'created' | 'unsupported' | 'cancelled';
  /** The credential id (base64url), when created — handed to the mock verifier. */
  credentialId?: string;
  credential?: PublicKeyCredential;
}

export const isWebAuthnSupported = (): boolean => typeof window !== 'undefined'
  && typeof window.PublicKeyCredential !== 'undefined'
  && typeof navigator !== 'undefined'
  && navigator.credentials != null;

/**
 * Run the browser registration ceremony. Resolves `cancelled` when the user
 * dismisses the prompt (the PasskeyPrompt screen offers a Cancel that maps to
 * the same state) and `unsupported` where WebAuthn is unavailable.
 */
export const registerPasskey = async (
  options: PasskeyRegistrationOptions,
): Promise<PasskeyRegistrationResult> => {
  if (!isWebAuthnSupported()) return { status: 'unsupported' };

  // TS infers this against the DOM `PublicKeyCredentialCreationOptions` at the
  // `create` call site — no explicit annotation, so no ambient-type reference
  // for `no-undef` to trip on.
  const publicKey = {
    challenge: fromB64url(options.challenge),
    rp: options.rp,
    user: {
      id: fromB64url(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    attestation: options.attestation,
  };

  try {
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (credential == null) return { status: 'cancelled' };
    return { status: 'created', credentialId: credential.id, credential };
  } catch {
    // NotAllowedError (user cancelled / timed out) and friends all surface as
    // a cancel to the flow — the prompt stays escapable.
    return { status: 'cancelled' };
  }
};

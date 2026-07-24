/**
 * TOTP (RFC 6238) via `otplib` — the second-factor primitive for both
 * enrollment (`/2fa/totp/*`) and sign-in step 2 (`/sign-in/2fa`).
 *
 * Parameters are left at otplib's Google-Authenticator-compatible defaults
 * (SHA-1, 6 digits, 30-second period) so any standard authenticator app works;
 * verification allows ±1 time step of clock drift.
 */
import { authenticator } from 'otplib';

/** Issuer label shown in authenticator apps and stamped into the otpauth URI. */
export const TOTP_ISSUER = 'Open Tomato';

// Accept a code from the adjacent 30s window on either side (±1 step) — a code
// entered right on a period boundary still validates. `authenticator` is a
// shared singleton; pinning options here applies to every verify in the service.
authenticator.options = { window: 1 };

/** Mint a fresh base32 TOTP secret to hand to the enrolling client. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Build the `otpauth://totp/...` URI the client renders as a QR code. Encodes
 * the issuer, the account label (the user's email), and the shared secret.
 */
export function buildOtpauthUri(secret: string, accountName: string): string {
  return authenticator.keyuri(accountName, TOTP_ISSUER, secret);
}

/**
 * Verify a user-entered TOTP code against a stored secret. Returns `false`
 * (never throws) for a wrong code, a malformed input, or a bad secret, so
 * callers treat it as a plain boolean. Whitespace is stripped; the code must be
 * exactly six digits.
 */
export function verifyTotp(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  try {
    return authenticator.check(normalized, secret);
  } catch {
    return false;
  }
}

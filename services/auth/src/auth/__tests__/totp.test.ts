import { authenticator } from 'otplib';
import { describe, expect, it } from 'vitest';

import { buildOtpauthUri, generateTotpSecret, TOTP_ISSUER, verifyTotp } from '../totp.js';

describe('totp', () => {
  it('generates a base32 secret that otplib round-trips', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/); // RFC 4648 base32, Google-Authenticator compatible
    expect(secret.length).toBeGreaterThanOrEqual(16);

    const code = authenticator.generate(secret);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('rejects a wrong or malformed code', () => {
    const secret = generateTotpSecret();
    const good = authenticator.generate(secret);
    // Flip the code to a definitely-different 6-digit value.
    const bad = good === '000000'
      ? '111111'
      : '000000';

    expect(verifyTotp(secret, bad)).toBe(false);
    expect(verifyTotp(secret, 'not-a-code')).toBe(false);
    expect(verifyTotp(secret, '12345')).toBe(false); // too short
    expect(verifyTotp(secret, '')).toBe(false);
  });

  it('tolerates surrounding whitespace in the entered code', () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotp(secret, `  ${code} `)).toBe(true);
  });

  it('builds an otpauth:// URI carrying the issuer, account, and secret', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const uri = buildOtpauthUri(secret, 'sam@open-tomato.dev');

    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain(`issuer=${encodeURIComponent(TOTP_ISSUER)}`);
    expect(uri).toContain(encodeURIComponent('sam@open-tomato.dev'));
  });
});

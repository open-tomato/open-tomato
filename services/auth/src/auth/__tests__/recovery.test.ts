import { describe, expect, it } from 'vitest';

import {
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_CODE_COUNT,
  verifyRecoveryCode,
} from '../recovery.js';

describe('recovery codes', () => {
  it('generates the contract count of distinct XXXX-XXXX codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
    expect(new Set(codes).size).toBe(codes.length); // no duplicates
  });

  it('normalizes case and formatting so entry is forgiving', () => {
    expect(normalizeRecoveryCode('4f8x-k2qm')).toBe('4F8XK2QM');
    expect(normalizeRecoveryCode('  4F8X K2QM ')).toBe('4F8XK2QM');
    expect(normalizeRecoveryCode('4F8XK2QM')).toBe('4F8XK2QM');
  });

  it('hashes a code so the display form verifies regardless of formatting', async () => {
    const code = generateRecoveryCodes()[0]!;
    const hash = await hashRecoveryCode(code);

    expect(hash).not.toBe(code); // never stored in plaintext
    expect(await verifyRecoveryCode(hash, code)).toBe(true);
    expect(await verifyRecoveryCode(hash, code.toLowerCase())).toBe(true);
    expect(await verifyRecoveryCode(hash, code.replace('-', ''))).toBe(true);
  });

  it('rejects a non-matching or malformed code without throwing', async () => {
    const hash = await hashRecoveryCode('4F8X-K2QM');
    expect(await verifyRecoveryCode(hash, '9P3R-LZN7')).toBe(false);
    expect(await verifyRecoveryCode('not-a-hash', '4F8X-K2QM')).toBe(false);
  });
});

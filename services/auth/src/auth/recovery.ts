/**
 * Recovery codes — single-use TOTP backup codes handed out once at 2FA
 * enrollment and redeemable in place of a live code at `/sign-in/2fa`.
 *
 * Codes are `XXXX-XXXX` from an unambiguous 32-symbol alphabet → 32^8 = 2^40 of
 * entropy per code. That is deliberately hashed with **argon2id** (same cost as
 * passwords, via `password.ts`) rather than a fast hash: 40 bits behind a fast
 * hash would be trivially brute-forced from a DB leak, but argon2id makes each
 * guess expensive. Redemption is a rare path, so the O(unused) verify loop the
 * salted hash forces is an acceptable trade for that safety.
 */
import { randomInt } from 'node:crypto';

import { hashPassword, verifyPassword } from './password.js';

/** How many recovery codes to mint per enrollment (matches the contract/UI). */
export const RECOVERY_CODE_COUNT = 8;

/** Symbols per code group and groups per code → `XXXX-XXXX`. */
const GROUP_LEN = 4;
const GROUPS = 2;

/**
 * Crockford-style alphabet with the visually ambiguous symbols removed
 * (`0/O`, `1/I/L`), so a user transcribing a code off paper can't fat-finger it.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Draw one uniformly-random symbol from {@link ALPHABET}. */
const randomSymbol = (): string => ALPHABET[randomInt(ALPHABET.length)] ?? ALPHABET[0]!;

/** Mint one `XXXX-XXXX` code. */
function generateRecoveryCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g += 1) {
    let group = '';
    for (let i = 0; i < GROUP_LEN; i += 1) group += randomSymbol();
    groups.push(group);
  }
  return groups.join('-');
}

/**
 * Mint a fresh set of distinct recovery codes. Duplicates are astronomically
 * unlikely but filtered anyway so a set always has {@link RECOVERY_CODE_COUNT}
 * usable codes.
 */
export function generateRecoveryCodes(): string[] {
  const codes = new Set<string>();
  while (codes.size < RECOVERY_CODE_COUNT) codes.add(generateRecoveryCode());
  return [...codes];
}

/**
 * Canonicalise a code for hashing/verification — uppercase, and strip the dash
 * and any stray whitespace — so the stored hash matches whatever formatting the
 * user types back in.
 */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Hash a recovery code (argon2id) for storage in `recovery_codes.code_hash`. */
export function hashRecoveryCode(code: string): Promise<string> {
  return hashPassword(normalizeRecoveryCode(code));
}

/**
 * Verify a user-entered code against a stored hash. Returns `false` (never
 * throws) on mismatch or a malformed stored hash.
 */
export function verifyRecoveryCode(storedHash: string, code: string): Promise<boolean> {
  return verifyPassword(storedHash, normalizeRecoveryCode(code));
}

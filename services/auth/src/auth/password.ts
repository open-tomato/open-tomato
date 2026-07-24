/**
 * Password hashing — argon2id via `@node-rs/argon2` (prebuilt binaries, no
 * node-gyp), per decision D-HASH. The encoded hash carries its own salt +
 * parameters, so verification needs only the stored string.
 */
import { randomUUID } from 'node:crypto';

import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/** The algorithm tag stored in `credentials.algo` for hashes this module mints. */
export const PASSWORD_ALGO = 'argon2id' as const;

/**
 * `@node-rs/argon2` exposes its `Algorithm` enum as an ambient `const enum`,
 * which `isolatedModules` forbids importing as a value. Argon2id's numeric
 * variant is `2` (Argon2d=0, Argon2i=1, Argon2id=2) — inline it here.
 */
const ARGON2ID = 2;

/**
 * OWASP argon2id minimum (Password Storage Cheat Sheet): m=19456 KiB, t=2, p=1.
 * Pinned explicitly rather than inheriting the library default (4 MiB), which
 * is materially weaker against offline cracking. Kept in one place so the
 * decoy hash below matches the real cost exactly (constant-time sign-in).
 */
const ARGON2_OPTS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Hash a plaintext password with argon2id. Returns the self-describing encoded
 * hash string (`$argon2id$v=19$m=...`) to persist in `credentials.password_hash`.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return argonHash(plaintext, ARGON2_OPTS);
}

/**
 * Verify a plaintext password against a stored argon2id hash. Returns `false`
 * (never throws) on any mismatch or malformed hash, so callers can treat the
 * result as a plain boolean without special-casing errors.
 */
export async function verifyPassword(storedHash: string, plaintext: string): Promise<boolean> {
  try {
    return await argonVerify(storedHash, plaintext);
  } catch {
    return false;
  }
}

/**
 * A fixed decoy argon2id hash (of a random throwaway secret), computed once and
 * cached. Sign-in verifies against this when the account/credential is absent,
 * so the unknown-email and wrong-password paths pay the *same* argon2 cost and
 * cannot be told apart by response timing (closes the enumeration oracle the
 * identical-response design targets). Same params as real hashes → same cost.
 */
let decoyHash: Promise<string> | null = null;
export function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword(`decoy-${randomUUID()}`);
  return decoyHash;
}

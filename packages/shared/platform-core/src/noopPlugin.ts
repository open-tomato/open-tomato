import type { PlatformPlugin } from './plugin';
import type {
  EmitResult,
  MatchResult,
  ValidationResult,
} from './types';

import { createHash } from 'node:crypto';

/**
 * Deterministic SHA-256 hex digest of an empty `EmitResult.targets`.
 *
 * The canonical form of zero targets is the empty JSON array `"[]"`, so this
 * constant is exactly `sha256("[]")`. Tests can import this constant to assert
 * against a known value without recomputing the hash.
 */
export const EMPTY_EMIT_LOCK_HASH = createHash('sha256')
  .update('[]')
  .digest('hex');

/**
 * Create a reference no-op `PlatformPlugin` used as a test fixture and as a
 * structural sanity check for the contract.
 *
 * Every method resolves to an empty/safe default:
 * - `matchCapabilities` reports no match (`{ matches: false, score: 0, missing: [] }`).
 * - `resolvePlatformRefs` returns the input template unchanged.
 * - `validateProvision` reports valid with no errors or warnings.
 * - `emit` returns no targets and `EMPTY_EMIT_LOCK_HASH` as the deterministic
 *   lock hash for the empty target list.
 *
 * @param name - Stable plugin identifier to expose as `plugin.name`.
 */
export function createNoopPlugin(name: string): PlatformPlugin {
  return {
    name,
    version: '0.0.0',
    matchCapabilities: async (): Promise<MatchResult> => ({
      matches: false,
      score: 0,
      missing: [],
    }),
    resolvePlatformRefs: async (template: string): Promise<string> => template,
    validateProvision: async (): Promise<ValidationResult> => ({
      valid: true,
      errors: [],
      warnings: [],
    }),
    emit: async (): Promise<EmitResult> => ({
      targets: [],
      lockHash: EMPTY_EMIT_LOCK_HASH,
    }),
  };
}

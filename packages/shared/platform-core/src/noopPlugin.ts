import type { PlatformPlugin } from './plugin';
import type {
  EmitResult,
  MatchResult,
  ValidationResult,
} from './types';

/**
 * Create a reference no-op `PlatformPlugin` used as a test fixture and as a
 * structural sanity check for the contract.
 *
 * Every method resolves to an empty/safe default:
 * - `matchCapabilities` reports no match (`{ matches: false, score: 0, missing: [] }`).
 * - `resolvePlatformRefs` returns the input template unchanged.
 * - `validateProvision` reports valid with no errors or warnings.
 * - `emit` returns no targets and a placeholder lock hash.
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
      lockHash: '',
    }),
  };
}

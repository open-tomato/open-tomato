/**
 * Resolves a per-hat backend override (string name or full descriptor)
 * into a concrete `BackendDescriptor`.
 */

import type { BackendDescriptor } from './backend-descriptor.js';

import { BackendFactory } from './backend-factory.js';

/**
 * Resolves a backend override value into a `BackendDescriptor`.
 *
 * - If the override is a `string`, it is treated as a named backend and
 *   resolved via `BackendFactory.create()`.
 * - If the override is already a `BackendDescriptor`, it is returned as-is
 *   via `BackendFactory.createCustom()` (defensive copy).
 *
 * @throws {Error} If a string name does not match any known backend.
 */
export function resolveBackendOverride(
  override: string | BackendDescriptor,
): BackendDescriptor {
  if (typeof override === 'string') {
    const descriptor = BackendFactory.create(override as 'claude' | 'gemini' | 'codex');
    if (!descriptor) {
      throw new Error(`Unknown backend name: '${override}'`);
    }
    return descriptor;
  }
  return BackendFactory.createCustom(override);
}

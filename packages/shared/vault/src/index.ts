/**
 * Public entry point for `@open-tomato/vault`.
 *
 * Resolves `{{vault.<id>}}` references against Bitwarden Secrets Manager,
 * with id-mapping fallbacks (`<id>-<env>-<region>` → `<id>-<env>` → `<id>`)
 * and pluggable auth strategies (`env` / `file` / `interactive`).
 */

export type { AuthStrategy } from './auth.js';

export type { LoadSecretsOptions } from './loadSecrets.js';
export { loadSecrets } from './loadSecrets.js';

export { resolveVaultId } from './mapping.js';

export {
  VaultError,
  VaultAuthError,
  VaultRefNotFoundError,
  VaultIOError,
} from './errors.js';

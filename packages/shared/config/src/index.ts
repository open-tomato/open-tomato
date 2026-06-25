// Runtime loader
export { loadConfig } from './loader.js';
export type {
  LoadConfigOptions,
  LoadConfigResult,
  ResolvedConfig,
} from './loader.js';

// Schema + extension mechanism
export {
  defineConfig,
  BaseConfigSchema,
  ProjectSchema,
  ProjectTypeSchema,
} from './schema.js';
export type { ConfigExtension, ProjectConfig, ProjectType } from './schema.js';

// Provision shorthands (`true` / `false` / object) — schema v2
export { ProvisionSchema, coerceProvision } from './provision.js';

// Platform-ref placeholders (`{{platform.<vendor>.<path>}}`) — schema v2
export {
  PLATFORM_REF_PATTERN,
  isPlatformRef,
  extractPlatformRefs,
} from './platformRefs.js';

// Errors
export { ConfigError } from './errors.js';
export type { ConfigErrorCode, ConfigErrorContext } from './errors.js';

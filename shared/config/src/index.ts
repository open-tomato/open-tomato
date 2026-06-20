// Runtime loader
export { loadConfig } from './loader.js';
export type { LoadConfigOptions, ResolvedConfig } from './loader.js';

// Schema + extension mechanism
export {
  defineConfig,
  BaseConfigSchema,
  ProjectSchema,
  ProjectTypeSchema,
} from './schema.js';
export type { ConfigExtension, ProjectConfig, ProjectType } from './schema.js';

// Errors
export { ConfigError } from './errors.js';
export type { ConfigErrorCode, ConfigErrorContext } from './errors.js';

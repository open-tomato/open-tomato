// Core config schemas
export * from './schemas/core-config.schema.js';
export * from './schemas/event-loop.schema.js';
export * from './schemas/cli.schema.js';
export * from './schemas/core.schema.js';
export * from './schemas/memories.schema.js';
export * from './schemas/tasks.schema.js';
export * from './schemas/hooks.schema.js';
export * from './schemas/skills.schema.js';
export * from './schemas/features.schema.js';
export * from './schemas/robot.schema.js';

// Hat collection schemas
export * from './schemas/hat.schema.js';
export * from './schemas/hat-collection.schema.js';
export * from './schemas/backend-descriptor.schema.js';

// Public types (CoreConfig is inferred from CoreConfigSchema; ResolvedConfig and LoadConfigOptions are defined only in types.ts)
export type { CoreConfig, ResolvedConfig, LoadConfigOptions } from './types.js';

// Constants
export { RESERVED_TRIGGER_NAMES } from './constants.js';

// Errors
export { ConfigValidationError, ConfigSemanticError } from './errors.js';

// Hat collection merging
export { mergeHatCollections, loadAndMergeCollections } from './hat-merger.js';

// Public loader API
export { loadConfig } from './loader.js';

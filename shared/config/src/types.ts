
import type { CliSchema } from './schemas/cli.schema.js';
import type { CoreConfigSchema } from './schemas/core-config.schema.js';
import type { CoreInternalSchema } from './schemas/core.schema.js';
import type { EventLoopSchema } from './schemas/event-loop.schema.js';
import type { FeaturesSchema } from './schemas/features.schema.js';
import type { HatCollection } from './schemas/hat-collection.schema.js';
import type { HookSpecSchema, HooksSchema } from './schemas/hooks.schema.js';
import type { MemoriesSchema } from './schemas/memories.schema.js';
import type { RobotSchema } from './schemas/robot.schema.js';
import type { SkillOverrideSchema, SkillsSchema } from './schemas/skills.schema.js';
import type { TasksSchema } from './schemas/tasks.schema.js';
import type { z } from 'zod';

export type { HatCollection };
export type { Hat } from './schemas/hat.schema.js';

/** Inferred type for the `event_loop` config section. */
export type EventLoop = z.infer<typeof EventLoopSchema>;
/** Inferred type for the `cli` config section. */
export type Cli = z.infer<typeof CliSchema>;
/** Inferred type for the `core` (internal) config section. */
export type CoreInternal = z.infer<typeof CoreInternalSchema>;
/** Inferred type for the `memories` config section. */
export type Memories = z.infer<typeof MemoriesSchema>;
/** Inferred type for the `tasks` config section. */
export type Tasks = z.infer<typeof TasksSchema>;
/** Inferred type for a single hook specification entry. */
export type HookSpec = z.infer<typeof HookSpecSchema>;
/** Inferred type for the `hooks` config section. */
export type Hooks = z.infer<typeof HooksSchema>;
/** Inferred type for a single skill override entry. */
export type SkillOverride = z.infer<typeof SkillOverrideSchema>;
/** Inferred type for the `skills` config section. */
export type Skills = z.infer<typeof SkillsSchema>;
/** Inferred type for the `features` config section. */
export type Features = z.infer<typeof FeaturesSchema>;
/** Inferred type for the `robot` config section. */
export type Robot = z.infer<typeof RobotSchema>;
/** Inferred type for the full core configuration object. */
export type CoreConfig = z.infer<typeof CoreConfigSchema>;
/**
 * The fully resolved configuration returned by {@link loadConfig}.
 *
 * Extends `CoreConfig` with an optional `hatCollection` field that is
 * populated when `hatSources` are provided to `loadConfig`.
 */
export type ResolvedConfig = CoreConfig & { hatCollection?: HatCollection };

/**
 * Options accepted by the {@link loadConfig} public API entry point.
 */
export type LoadConfigOptions = {
  /** Path to the core config YAML file. */
  configPath: string;
  /**
   * Optional list of hat collection sources to load and merge left-to-right.
   * Each entry is either a file path or a `builtin:<name>` specifier.
   */
  hatSources?: string[];
  /**
   * Optional env-var key/value pairs that take final precedence over both
   * the config file and `process.env`.
   */
  envOverride?: Record<string, string>;
};

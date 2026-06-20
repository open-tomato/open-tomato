import { z } from 'zod';

import { CliSchema } from './cli.schema.js';
import { CoreInternalSchema } from './core.schema.js';
import { EventLoopSchema } from './event-loop.schema.js';
import { FeaturesSchema } from './features.schema.js';
import { HooksSchema } from './hooks.schema.js';
import { MemoriesSchema } from './memories.schema.js';
import { RobotSchema } from './robot.schema.js';
import { SkillsSchema } from './skills.schema.js';
import { TasksSchema } from './tasks.schema.js';

/**
 * Zod schema for the complete core configuration object.
 *
 * Composes all section schemas with section-level defaults so an empty YAML
 * file produces a fully-populated config with sensible values. Includes a
 * `.refine` that rejects configs where both `prompt` and `prompt_file` are
 * set simultaneously.
 */
export const CoreConfigSchema = z.object({
  event_loop: EventLoopSchema.default({}),
  cli: CliSchema.default({}),
  core: CoreInternalSchema.default({}),
  memories: MemoriesSchema.default({}),
  tasks: TasksSchema.default({}),
  hooks: HooksSchema.default({}),
  skills: SkillsSchema.default({}),
  features: FeaturesSchema.default({}),
  robot: RobotSchema.default({}),
  prompt: z.string().optional(),
  prompt_file: z.string().optional(),
}).refine(
  (val) => !(val.prompt && val.prompt_file),
  { message: 'prompt and prompt_file are mutually exclusive', path: ['prompt_file'] },
);

/**
 * Zod schemas for the four-section config standard (OPT-137) and the
 * `defineConfig` extension mechanism.
 *
 * - `project` is validated strictly against type-specific rules.
 * - `infrastructure` and `env` are accepted as open objects at the base level;
 *   services tighten them with {@link defineConfig}, and vendor plugins extend
 *   `infrastructure` with their own islands (e.g. `infrastructure.homelab`).
 */
import { z } from 'zod';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ProjectTypeSchema = z.enum(['service', 'frontend', 'mcp', 'package']);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;

const ProjectBaseSchema = z.object({
  id: z.string().regex(KEBAB_CASE, 'project.id must be kebab-case'),
  type: ProjectTypeSchema,
  name: z.string().optional(),
  port: z.number().int()
    .positive()
    .optional(),
  url: z.string().optional(),
  routes: z.array(z.string()).optional(),
  environments: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
});

/**
 * `project` section with the type-specific rules from OPT-137:
 * `port` is required for `service`/`mcp` and forbidden for `frontend`/`package`;
 * `url` is required for `frontend` and forbidden for `package`;
 * `routes` are only valid for `frontend`.
 */
export const ProjectSchema = ProjectBaseSchema.superRefine((project, ctx) => {
  const requiresPort = project.type === 'service' || project.type === 'mcp';
  const forbidsPort = project.type === 'frontend' || project.type === 'package';

  if (requiresPort && project.port === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['port'],
      message: `port is required for type '${project.type}'`,
    });
  }
  if (forbidsPort && project.port !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['port'],
      message: `port is not allowed for type '${project.type}'`,
    });
  }
  if (project.type === 'frontend' && project.url === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['url'],
      message: 'url is required for type \'frontend\'',
    });
  }
  if (project.type === 'package' && project.url !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['url'],
      message: 'url is not allowed for type \'package\'',
    });
  }
  if (project.type !== 'frontend' && project.routes !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['routes'],
      message: 'routes are only allowed for type \'frontend\'',
    });
  }
});

/** The inferred shape of a validated `project` section. */
export type ProjectConfig = z.infer<typeof ProjectSchema>;

/**
 * The base config schema. `project` is strict; `infrastructure` and `env` accept
 * any object shape here and are refined per-service via {@link defineConfig}.
 * Unknown top-level keys (e.g. the CLI's `vault` mapping) are ignored.
 */
export const BaseConfigSchema = z.object({
  project: ProjectSchema,
  infrastructure: z.record(z.unknown()).optional(),
  env: z.record(z.unknown()).optional(),
});

/** A service-level schema extension produced by {@link defineConfig}. */
export interface ConfigExtension<TEnv = unknown, TInfra = unknown> {
  readonly env?: z.ZodType<TEnv>;
  readonly infrastructure?: z.ZodType<TInfra>;
}

/**
 * Declare a service-level extension to the base schema. The returned object is
 * passed to `loadConfig({ schema })` to both enrich type inference of `env` /
 * `infrastructure` and add runtime validation for them.
 */
export function defineConfig<TEnv = unknown, TInfra = unknown>(extension: {
  env?: z.ZodType<TEnv>;
  infrastructure?: z.ZodType<TInfra>;
}): ConfigExtension<TEnv, TInfra> {
  return extension;
}

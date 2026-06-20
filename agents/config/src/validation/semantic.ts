import type { CoreConfig } from '../types.js';

import { ConfigSemanticError } from '../errors.js';

import { validateHooks } from './hooks.js';

/**
 * Runs semantic validation checks on a `CoreConfig` that cannot be expressed
 * in Zod schema constraints alone.
 *
 * Currently enforces:
 * - **Bot token resolvability**: when `robot.enabled` is `true`, `robot.bot_token`
 *   must either be provided directly in the config or be resolvable as an
 *   environment variable reference (a string of the form `$VAR_NAME` or
 *   `${VAR_NAME}`) whose value is present in `process.env`.
 * - **Hook validation**: delegates to {@link validateHooks} which enforces
 *   canonical phase keys and the mutation contract (pre-execution phase hooks
 *   must not publish events).
 *
 * @param config - A fully parsed and env-override-applied `CoreConfig`.
 * @throws {ConfigSemanticError} When any semantic check fails.
 */
export async function validateSemantics(config: CoreConfig): Promise<void> {
  validateBotToken(config);
  validateHooks(config.hooks);
}

/**
 * Checks that a bot token is resolvable when the robot integration is enabled.
 *
 * Accepts three forms:
 * 1. A literal token string (non-empty, not an env-var reference).
 * 2. `$VAR_NAME` — resolved from `process.env.VAR_NAME`.
 * 3. `${VAR_NAME}` — resolved from `process.env.VAR_NAME`.
 *
 * If `robot.enabled` is `true` and none of these conditions are met, a
 * `ConfigSemanticError` is thrown.
 */
function validateBotToken(config: CoreConfig): void {
  if (!config.robot.enabled) {
    return;
  }

  const { bot_token } = config.robot;

  if (bot_token === undefined || bot_token === '') {
    throw new ConfigSemanticError(
      'robot.bot_token is required when robot.enabled is true',
    );
  }

  // Resolve env-var reference forms: $VAR or ${VAR}
  const envVarBraces = /^\$\{([^}]+)\}$/;
  const envVarPlain = /^\$([A-Za-z_][A-Za-z0-9_]*)$/;

  const bracesMatch = envVarBraces.exec(bot_token);
  const plainMatch = envVarPlain.exec(bot_token);

  if (bracesMatch ?? plainMatch) {
    const varName = (bracesMatch?.[1] ?? plainMatch?.[1]) as string;
    const resolved = process.env[varName];
    if (!resolved) {
      throw new ConfigSemanticError(
        `robot.bot_token references environment variable "${varName}" which is not set`,
      );
    }
    // Token is resolvable — no further action needed.
    return;
  }

  // Treat as a literal token; it is already present.
}


import type { ZodError } from 'zod';

/**
 * Thrown when a config file fails Zod schema validation.
 *
 * When constructed with a `ZodError`, formats its issues into human-readable
 * lines of the form `  - <path>: <message>`. When constructed with a plain
 * string, uses that string as the message directly.
 */
export class ConfigValidationError extends Error {
  readonly zodError?: ZodError;

  constructor(messageOrZodError: string | ZodError) {
    if (typeof messageOrZodError === 'string') {
      super(messageOrZodError);
    } else {
      const lines = messageOrZodError.issues.map(
        (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
      );
      super(`Config validation failed:\n${lines.join('\n')}`);
      this.zodError = messageOrZodError;
    }
    this.name = 'ConfigValidationError';
  }
}

/**
 * Thrown when a config passes schema validation but fails a semantic check
 * that cannot be expressed in Zod (e.g. unresolvable env-var references,
 * invalid hook contracts).
 */
export class ConfigSemanticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigSemanticError';
  }
}

/**
 * Thrown when a YAML file path does not exist on disk.
 */
export class YamlFileNotFoundError extends Error {
  readonly filePath: string;

  constructor(filePath: string) {
    super(`YAML file not found: ${filePath}`);
    this.name = 'YamlFileNotFoundError';
    this.filePath = filePath;
  }
}

/**
 * Thrown when a YAML file exists but its content cannot be parsed.
 */
export class YamlParseError extends Error {
  readonly filePath: string;

  constructor(filePath: string, cause: unknown) {
    const causeMessage = cause instanceof Error
      ? cause.message
      : String(cause);
    super(`Failed to parse YAML file "${filePath}": ${causeMessage}`);
    this.name = 'YamlParseError';
    this.filePath = filePath;
    this.cause = cause;
  }
}

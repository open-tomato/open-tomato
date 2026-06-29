import type {
  CliContext,
  CliEvent,
  CliEventResult,
  CliEventStart,
  CliOutput,
  CliOutputStream,
} from '@open-tomato/cli-core';

import process from 'node:process';

import { assembleContext } from '@open-tomato/cli-core';

import {
  findOpenTomatoRoot,
  loadExternalCommands,
  loadManifest,
} from './discovery/index.js';
import { runLegacyCommand } from './legacyShim.js';
import { CommandRegistry, type ExternalCommandRegistration } from './registry.js';

export interface DispatchOptions {
  /**
   * Registry used to resolve commands. When omitted, a new registry is
   * constructed and {@link CommandRegistry.autoload} is invoked before
   * routing so filesystem-discovered commands become available.
   */
  registry?: CommandRegistry;
  /**
   * Environment passed to {@link assembleContext}. Defaults to
   * {@link process.env}. Tests pass an empty object to keep dispatch
   * deterministic.
   */
  env?: Readonly<Record<string, string | undefined>>;
  /**
   * Output stream forwarded to {@link assembleContext}. Tests inject a
   * recording stream to assert NDJSON output.
   */
  stream?: CliOutputStream;
}

const errorCode = (err: unknown): string => {
  if (
    typeof err === 'object'
    && err !== null
    && 'code' in err
    && typeof (err as { code: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code;
  }
  return 'error';
};

const errorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
};

/**
 * Route a single CLI invocation.
 *
 * `argv` is the user-supplied argument list (i.e., `process.argv.slice(2)`),
 * not the raw `process.argv`. The first two positional arguments are
 * interpreted as `<tool>` and `<command>`; any remaining positionals are
 * exposed to the command via `ctx.args`.
 */
export async function dispatch(
  argv: string[],
  options: DispatchOptions = {},
): Promise<number> {
  const env = options.env ?? process.env;

  const baseCtx = assembleContext({
    argv,
    env,
    ...(options.stream === undefined
      ? {}
      : { stream: options.stream }),
  });

  let registry: CommandRegistry;
  if (options.registry !== undefined) {
    registry = options.registry;
  } else {
    let externalCommands: readonly ExternalCommandRegistration[] = [];
    const rootDir = findOpenTomatoRoot(process.cwd());
    if (rootDir !== null) {
      const manifest = loadManifest(rootDir);
      if (manifest !== null) {
        externalCommands = await loadExternalCommands(manifest, rootDir);
      }
    }
    registry = new CommandRegistry({ externalCommands });
    await registry.autoload();
  }

  // Resolve the command. Two routing shapes are supported:
  //   <tool> <command> [...args]  — the canonical two-token form, and
  //   <command> [...args]         — a single-token verb registered as
  //                                 tool === command (e.g. `setup`).
  // The two-token form is tried first so an explicit `<tool> <command>`
  // always wins; the single-token form is the fallback so flags following a
  // single verb (`setup --dry-run`) are passed through as command args.
  const resolved = resolveCommand(registry, baseCtx.args);

  const commandLabel = resolved !== null
    ? `${resolved.tool} ${resolved.command}`
    : '';

  // Track terminal/start events the command emits itself. Dispatch must emit
  // exactly one `start` and one terminal `result`; when the dispatched command
  // emits its own, dispatch suppresses the duplicate rather than adding a
  // second event (grow-box's CliCommand objects emit their own data-bearing
  // `result`, which must remain the terminal one).
  let commandEmittedStart = false;
  let commandEmittedResult = false;
  const baseOutput = baseCtx.output;
  const trackingOutput: CliOutput = {
    info: (m) => baseOutput.info(m),
    warn: (m) => baseOutput.warn(m),
    error: (m) => baseOutput.error(m),
    debug: (m) => baseOutput.debug(m),
    emit: (event: CliEvent): void => {
      if (event.type === 'start') {
        if (commandEmittedStart) return;
        commandEmittedStart = true;
      } else if (event.type === 'result') {
        commandEmittedResult = true;
      }
      baseOutput.emit(event);
    },
    result: (payload: unknown): void => {
      commandEmittedResult = true;
      baseOutput.result(payload);
    },
  };

  const commandArgs = resolved === null
    ? baseCtx.args
    : baseCtx.args.slice(resolved.consumed);

  const ctx: CliContext = Object.freeze({
    ...baseCtx,
    args: Object.freeze(commandArgs),
    output: trackingOutput,
  });

  const emitStart = (): void => {
    if (commandEmittedStart) return;
    commandEmittedStart = true;
    const event: CliEventStart = {
      type: 'start',
      command: commandLabel,
      ts: new Date().toISOString(),
    };
    baseOutput.emit(event);
  };

  const emitResult = (
    payload: Omit<CliEventResult, 'type' | 'ts'>,
  ): void => {
    if (commandEmittedResult) return;
    commandEmittedResult = true;
    const event: CliEventResult = {
      type: 'result',
      ts: new Date().toISOString(),
      ...payload,
    };
    baseOutput.emit(event);
  };

  if (resolved === null) {
    emitStart();
    emitResult({
      ok: false,
      error: {
        code: 'usage',
        message: 'Usage: tomato <tool> <command> [...args]',
      },
    });
    return 1;
  }

  const mod = registry.get(resolved.tool, resolved.command);
  if (mod === null) {
    emitStart();
    emitResult({
      ok: false,
      error: {
        code: 'command_not_found',
        message: `Command not found: ${resolved.tool} ${resolved.command}`,
      },
    });
    return 1;
  }

  emitStart();
  try {
    if (mod.meta === undefined) {
      await runLegacyCommand(ctx, mod);
    } else {
      await mod.default(ctx);
    }
    // Only add a terminal result if the command did not emit its own.
    emitResult({ ok: true });
    return 0;
  } catch (err: unknown) {
    emitResult({
      ok: false,
      error: {
        code: errorCode(err),
        message: errorMessage(err),
      },
    });
    return 1;
  }
}

interface ResolvedCommand {
  tool: string;
  command: string;
  /** Number of leading positionals consumed as the command path. */
  consumed: number;
}

/**
 * Map the leading positionals onto a registered command.
 *
 * Tries the canonical `<tool> <command>` pair first, then falls back to a
 * single-token verb registered as `tool === command`. Returns `null` when no
 * positionals are present (usage error) or when a single positional matches no
 * single-token command (so dispatch reports `command_not_found` against the
 * two-token shape, preserving the prior contract).
 */
function resolveCommand(
  registry: CommandRegistry,
  args: readonly string[],
): ResolvedCommand | null {
  const first = args[0];
  const second = args[1];

  if (first === undefined) return null;

  if (second !== undefined && registry.get(first, second) !== null) {
    return { tool: first, command: second, consumed: 2 };
  }

  // Single-token verb: `setup` registered as tool === command === 'setup'.
  if (registry.get(first, first) !== null) {
    return { tool: first, command: first, consumed: 1 };
  }

  // No single-token match. Fall back to the two-token shape when a second
  // positional exists so the `command_not_found` message names `<tool>
  // <command>`; otherwise this is an unresolved single token.
  if (second !== undefined) {
    return { tool: first, command: second, consumed: 2 };
  }

  return null;
}

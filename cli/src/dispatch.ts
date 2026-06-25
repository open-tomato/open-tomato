import type {
  CliContext,
  CliEventResult,
  CliEventStart,
  CliOutputStream,
} from '@open-tomato/cli-core';

import process from 'node:process';

import { assembleContext } from '@open-tomato/cli-core';

import { runLegacyCommand } from './legacyShim.js';
import { CommandRegistry } from './registry.js';

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

  const tool = baseCtx.args[0];
  const command = baseCtx.args[1];
  const commandArgs = baseCtx.args.slice(2);

  const ctx: CliContext = Object.freeze({
    ...baseCtx,
    args: Object.freeze(commandArgs),
  });

  const commandLabel = tool !== undefined && command !== undefined
    ? `${tool} ${command}`
    : '';

  const emitStart = (): void => {
    const event: CliEventStart = {
      type: 'start',
      command: commandLabel,
      ts: new Date().toISOString(),
    };
    ctx.output.emit(event);
  };

  const emitResult = (
    payload: Omit<CliEventResult, 'type' | 'ts'>,
  ): void => {
    const event: CliEventResult = {
      type: 'result',
      ts: new Date().toISOString(),
      ...payload,
    };
    ctx.output.emit(event);
  };

  if (tool === undefined || command === undefined) {
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

  const registry = options.registry ?? new CommandRegistry();
  if (options.registry === undefined) {
    await registry.autoload();
  }

  const mod = registry.get(tool, command);
  if (mod === null) {
    emitStart();
    emitResult({
      ok: false,
      error: {
        code: 'command_not_found',
        message: `Command not found: ${tool} ${command}`,
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

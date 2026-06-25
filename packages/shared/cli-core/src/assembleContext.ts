import type { CliOutput, CliOutputStream } from './output';
import type { CliContext } from './types';

import { createJsonOutput, createTextOutput } from './output';
import { parseArgs } from './parseArgs';

export interface AssembleContextOptions {
  argv: string[];
  env: Readonly<Record<string, string | undefined>>;
  forceOutputMode?: 'text' | 'json';
  signal?: AbortSignal;
  stream?: CliOutputStream;
}

const defaultStream: CliOutputStream = {
  write(chunk: string): unknown {
    return process.stdout.write(chunk);
  },
};

const clampVerbosity = (value: number): 0 | 1 | 2 | 3 => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 3) {
    return 3;
  }
  if (value >= 2) {
    return 2;
  }
  return 1;
};

const countVerboseTokens = (argv: readonly string[]): number => {
  let count = 0;
  for (const arg of argv) {
    if (arg === '--') {
      break;
    }
    if (arg === '-v' || arg === '--verbose') {
      count++;
    }
  }
  return count;
};

const resolveOutputMode = (
  force: 'text' | 'json' | undefined,
  flags: Readonly<Record<string, string | boolean>>,
  env: Readonly<Record<string, string | undefined>>,
): 'text' | 'json' => {
  if (force !== undefined) {
    return force;
  }
  const flagOutput = flags.output;
  if (typeof flagOutput === 'string') {
    return flagOutput === 'json'
      ? 'json'
      : 'text';
  }
  if (env.TOMATO_OUTPUT === 'json') {
    return 'json';
  }
  return 'text';
};

const resolveVerbosity = (
  argv: readonly string[],
  flags: Readonly<Record<string, string | boolean>>,
  env: Readonly<Record<string, string | undefined>>,
): 0 | 1 | 2 | 3 => {
  const flagValue = flags.verbose ?? flags.v;
  if (typeof flagValue === 'string') {
    const parsed = Number.parseInt(flagValue, 10);
    if (!Number.isNaN(parsed)) {
      return clampVerbosity(parsed);
    }
  }
  if (flagValue === true) {
    const count = countVerboseTokens(argv);
    if (count > 0) {
      return clampVerbosity(count);
    }
  }
  const envValue = env.TOMATO_VERBOSITY;
  if (envValue !== undefined) {
    const parsed = Number.parseInt(envValue, 10);
    if (!Number.isNaN(parsed)) {
      return clampVerbosity(parsed);
    }
  }
  return 0;
};

export function assembleContext(options: AssembleContextOptions): CliContext {
  const { argv, env, forceOutputMode, signal, stream } = options;
  const { positional, flags } = parseArgs(argv);
  const outputMode = resolveOutputMode(forceOutputMode, flags, env);
  const verbosity = resolveVerbosity(argv, flags, env);
  const resolvedStream = stream ?? defaultStream;
  const output: CliOutput = outputMode === 'json'
    ? createJsonOutput({ stream: resolvedStream })
    : createTextOutput({ verbosity, stream: resolvedStream });
  const resolvedSignal = signal ?? new AbortController().signal;

  const context: CliContext = {
    args: Object.freeze(positional),
    flags: Object.freeze(flags),
    outputMode,
    verbosity,
    output,
    signal: resolvedSignal,
    env: Object.freeze({ ...env }),
  };

  return Object.freeze(context);
}

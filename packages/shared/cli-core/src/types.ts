import type { CliOutput } from './output';

export interface CliContext {
  args: readonly string[];
  flags: Readonly<Record<string, string | boolean>>;
  outputMode: 'text' | 'json';
  verbosity: 0 | 1 | 2 | 3;
  output: CliOutput;
  signal: AbortSignal;
  env: Readonly<Record<string, string | undefined>>;
}

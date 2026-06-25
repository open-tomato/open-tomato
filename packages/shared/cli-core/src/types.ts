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

export interface ArgSpec {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: string | boolean | number;
  aliases?: readonly string[];
}

export interface FlagSpec {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: string | boolean | number;
  aliases?: readonly string[];
}

export interface CliCommand {
  name: string;
  description: string;
  args: ArgSpec[];
  flags: FlagSpec[];
  run: (context: CliContext) => Promise<void>;
}

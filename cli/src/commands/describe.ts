import type {
  ArgSpec,
  CliCommand,
  CliContext,
  CliEventResult,
  FlagSpec,
} from '@open-tomato/cli-core';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CommandRegistry } from '../registry.js';

const SCHEMA_VERSION = 1 as const;
const BINARY_NAME = 'tomato' as const;

function readCliVersion(): string {
  const packageJsonPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'package.json',
  );
  const raw = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    version: string;
  };
  return raw.version;
}

const CLI_VERSION = readCliVersion();

export interface DescribeCommandEntry {
  tool: string;
  command: string;
  description: string;
  args: readonly ArgSpec[];
  flags: readonly FlagSpec[];
}

export interface DescribePayload {
  schemaVersion: typeof SCHEMA_VERSION;
  binary: typeof BINARY_NAME;
  version: string;
  commands: DescribeCommandEntry[];
}

export function collectDescribeEntries(
  registry: CommandRegistry,
): DescribeCommandEntry[] {
  return registry.list().map((entry) => ({
    tool: entry.tool,
    command: entry.command,
    description: entry.meta?.description ?? '',
    args: entry.meta?.args
      ? [...entry.meta.args]
      : [],
    flags: entry.meta?.flags
      ? [...entry.meta.flags]
      : [],
  }));
}

const run = async (ctx: CliContext): Promise<void> => {
  const registry = new CommandRegistry();
  await registry.autoload();

  const payload: DescribePayload = {
    schemaVersion: SCHEMA_VERSION,
    binary: BINARY_NAME,
    version: CLI_VERSION,
    commands: collectDescribeEntries(registry),
  };

  const event: CliEventResult = {
    type: 'result',
    ok: true,
    data: payload,
    ts: new Date().toISOString(),
  };
  ctx.output.emit(event);
};

export const meta: CliCommand = {
  name: 'describe',
  description: 'Emit a machine-readable description of every registered tomato command.',
  args: [],
  flags: [],
  run,
};

export default run;

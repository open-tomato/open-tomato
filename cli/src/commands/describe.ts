import type {
  ArgSpec,
  CliCommand,
  CliContext,
  CliEventResult,
  FlagSpec,
} from '@open-tomato/cli-core';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
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

export function renderTextTree(payload: DescribePayload): string {
  const byTool = new Map<string, DescribeCommandEntry[]>();
  for (const entry of payload.commands) {
    const bucket = byTool.get(entry.tool) ?? [];
    bucket.push(entry);
    byTool.set(entry.tool, bucket);
  }

  const lines: string[] = [`${payload.binary} ${payload.version}`, ''];

  const tools = [...byTool.keys()].sort((a, b) => a.localeCompare(b));
  for (const tool of tools) {
    const commands = (byTool.get(tool) ?? [])
      .slice()
      .sort((a, b) => a.command.localeCompare(b.command));
    lines.push(`${tool}:`);
    for (const entry of commands) {
      const suffix = entry.description.length > 0
        ? `: ${entry.description}`
        : '';
      lines.push(`  ${entry.command}${suffix}`);
    }
    lines.push('');
  }

  return lines.join('\n');
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

  if (ctx.outputMode === 'text') {
    process.stdout.write(`${renderTextTree(payload)}\n`);
    return;
  }

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

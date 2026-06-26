import type {
  ArgSpec,
  CliCommand,
  CliContext,
  CliEventResult,
  FlagSpec,
} from '@open-tomato/cli-core';

import { CommandRegistry } from '../registry.js';

export interface DescribeCommandEntry {
  tool: string;
  command: string;
  description: string;
  args: readonly ArgSpec[];
  flags: readonly FlagSpec[];
}

export interface DescribePayload {
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

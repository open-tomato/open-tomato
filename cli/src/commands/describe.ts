import type { CliCommand, CliContext } from '@open-tomato/cli-core';

const run = async (ctx: CliContext): Promise<void> => {
  void ctx;
};

export const meta: CliCommand = {
  name: 'describe',
  description: 'Emit a machine-readable description of every registered tomato command.',
  args: [],
  flags: [],
  run,
};

export default run;

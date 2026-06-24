#!/usr/bin/env bun

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { resolveRepoRoot } from './root.js';

export interface CommandContext {
  repoRoot: string | null;
}

type CommandModule = {
  default?: (args: string[], ctx: CommandContext) => unknown;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printUsage(): void {
  console.error('Usage: tomato <tool> <command> [...args]');
  console.error('');
  console.error('Tools: dependencies | event | linear | ralph');
  console.error('');
  console.error('Examples:');
  console.error('  tomato event listen');
  console.error('  tomato linear next');
  console.error('  tomato dependencies tree');
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const [, , tool, command, ...args] = argv;

  if (!tool || !command) {
    printUsage();
    process.exit(1);
  }

  const commandPath = path.resolve(
    __dirname,
    'commands',
    tool,
    `${command}.ts`,
  );

  if (!fs.existsSync(commandPath)) {
    console.error(`Command not found: ${tool} ${command}`);
    console.error(`Expected file at: ${commandPath}`);
    process.exit(1);
  }

  const repoRoot = resolveRepoRoot();
  const ctx: CommandContext = { repoRoot };

  let commandModule: CommandModule;
  try {
    commandModule = (await import(commandPath)) as CommandModule;
  } catch (err: unknown) {
    console.error('Error loading command:', err);
    process.exit(1);
  }

  if (typeof commandModule.default !== 'function') {
    console.error(`Invalid command module (no default export): ${commandPath}`);
    process.exit(1);
  }

  try {
    await commandModule.default(args, ctx);
  } catch (err: unknown) {
    console.error('Error running command:', err);
    process.exit(1);
  }
}

// When invoked directly (either `bun src/cli.ts` or via the `bin/tomato.ts`
// shebang wrapper), run `main()`. The guard prevents execution during
// `import` for testing.
if (import.meta.main) {
  void main();
}

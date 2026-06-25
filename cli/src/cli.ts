#!/usr/bin/env bun

import process from 'node:process';

import { dispatch } from './dispatch.js';

export interface CommandContext {
  repoRoot: string | null;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const code = await dispatch(argv.slice(2));
  process.exit(code);
}

// When invoked directly (either `bun src/cli.ts` or via the `bin/tomato.ts`
// shebang wrapper), run `main()`. The guard prevents execution during
// `import` for testing.
if (import.meta.main) {
  void main();
}

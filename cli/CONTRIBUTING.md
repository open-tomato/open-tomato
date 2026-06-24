# Contributing to `tomato-cli`

## Adding a command

Every command is a single file:

```text
src/commands/<tool>/<command>.ts
```

With a `default` async export that receives the parsed args and the
CLI context:

```ts
import type { CommandContext } from '../../cli.js';

export default async function myCommand(
  args: string[],
  { repoRoot }: CommandContext,
): Promise<void> {
  // ...
}
```

Running `tomato <tool> <command> [...args]` dispatches here.

### Accessing the repo root

```ts
if (!repoRoot) {
  console.error('❌ Not inside an open-tomato repository.');
  process.exit(2);
}
```

Commands that do not need a workspace context can ignore `repoRoot`.

### Using shared packages

Prefer `@open-tomato/logger`, `@open-tomato/errors`, and
`@open-tomato/linear` (already declared as dependencies) over rolling
new utilities. If you need an SDK that is not already a dep, add it to
`package.json#dependencies` — not a per-command `package.json` (those
were flattened during migration).

### Tests

Add a vitest file under `tests/`:

```ts
// tests/my-command.test.ts
import { describe, it, expect } from 'vitest';
import myCommand from '../src/commands/<tool>/<command>.js';

describe('my-command', () => {
  it('exits 2 outside a repo', async () => {
    // ...
  });
});
```

Command-level tests that need filesystem fixtures can sit next to the
command under `src/commands/<tool>/tests/`, but they are not included in
the default vitest run (`vitest.config.ts` restricts to `tests/**`).
Move them into `tests/` once they are stable enough for the default
gate.

## Local run

```sh
bun install
bun run dev <tool> <command>
```

## Full gate before committing

```sh
bun install
bun lint
bun run test
bun run check-types
```

Commits follow the umbrella format: `<type>(tomato-cli): <description>`
(see [../AGENTS.md](../AGENTS.md)).

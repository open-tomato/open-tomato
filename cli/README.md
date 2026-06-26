# tomato-cli

Standalone CLI for the open-tomato ecosystem. Dispatches to small
per-tool commands that live under `src/commands/<tool>/<command>.ts`.

## Install & run

### Global install (long-lived use)

```sh
cd tomato-cli
bun install -g .
# `tomato` is now on PATH
tomato event listen
```

### Run without installing

```sh
bunx --bun /Users/marcos/projects/open-tomato/tomato-cli event listen
# or once published to npm:
bunx @open-tomato/tomato-cli event listen
npx  @open-tomato/tomato-cli event listen
```

### Local dev inside this folder

```sh
bun install
bun bin/tomato.ts event listen
# or via the `dev` script:
bun run dev event listen
```

## Available commands

The dispatcher derives the command list from the filesystem at
`src/commands/<tool>/<command>.ts`. At the time of writing:

| Tool | Command | Purpose |
|------|---------|---------|
| `dependencies` | `tree` | Print the workspace dependency tree |
| `event` | `listen` | Stream events from the notifications bus (SSE) |
| `event` | `interact` | Interactive event browser / picker |
| `event` | `prune` | Drop events from the bus |
| `event` | `read` | Read recent events |
| `event` | `send` | Publish an event |
| `linear` | `login` | OAuth login for `@open-tomato/linear` |
| `linear` | `next` | Show the next Linear task |
| `linear` | `tasks` | List Linear tasks |
| `ralph` | `start` | Start the ralph task loop |
| `ralph` | `hyperloop` | Multi-issue orchestration loop |
| `ralph` | `effort-collect` | Collect commit effort data |
| `ralph` | `effort-query` | Query the effort database |
| `ralph` | `usage` | Print Claude usage stats |

## Repo-root detection

Commands that need workspace context (e.g., `dependencies tree`, the
`ralph` loop) call `resolveRepoRoot()` from
[`src/root.ts`](./src/root.ts). The resolver walks parent directories
from the current working directory and returns the first match for
either:

1. A `.open-tomato-root` file (explicit marker), or
2. A `package.json` whose `"workspaces"` field is present.

If no marker is found the resolver returns `null`. Commands that depend
on a root should emit a concise error and exit with status `2`:

```text
❌ Not inside an open-tomato repository.
Drop a `.open-tomato-root` file at the repo root or run from a workspace root.
```

Commands that do not need a root (e.g., `event listen` when pointed at a
remote notifications host) ignore the second argument and work from any
directory.

## Adding a new command

1. Create `src/commands/<tool>/<command>.ts`.
2. Preferred: export `meta` (a `CliCommand` from
   `@open-tomato/cli-core`) alongside a `default(ctx: CliContext)`
   async function. The dispatcher calls `default(ctx)` directly,
   passes positional args through `ctx.args`, flags through
   `ctx.flags`, and routes structured output through
   `ctx.output.emit`. In `--output=json` mode each emitted event is
   one NDJSON line on stdout; in `text` mode events render as
   prefixed lines.

   ```ts
   import type { CliCommand, CliContext } from '@open-tomato/cli-core';

   const run = async (ctx: CliContext): Promise<void> => {
     ctx.output.emit({
       type: 'step',
       name: 'greet',
       message: `hello ${ctx.args[0] ?? 'world'}`,
       ts: new Date().toISOString(),
     });

     ctx.output.emit({
       type: 'result',
       ok: true,
       data: { greeted: ctx.args[0] ?? 'world' },
       ts: new Date().toISOString(),
     });
   };

   export const meta: CliCommand = {
     name: 'greet',
     description: 'Print a greeting and emit structured events.',
     args: [
       { name: 'name', description: 'Who to greet', type: 'string' },
     ],
     flags: [],
     run,
   };

   export default run;
   ```

   `meta` is what `tomato describe` walks to produce its tree, so
   keep `description`, `args`, and `flags` accurate.

3. Legacy shape (still supported). A module that exports only
   `default(args: string[], { repoRoot }: CommandContext)` is routed
   through `runLegacyCommand`, which builds the `{ repoRoot }` adapter
   via `resolveRepoRoot()` and forwards positional args. Migrate to
   the meta-aware shape when you next touch the file.

   ```ts
   import type { CommandContext } from '../../cli.js';

   export default async function myCommand(
     args: string[],
     { repoRoot }: CommandContext,
   ): Promise<void> {
     if (!repoRoot) {
       console.error('❌ Not inside an open-tomato repository.');
       process.exit(2);
     }
     // ...
   }
   ```

4. Running `tomato <tool> <command> [...args]` dispatches here.
5. Add a vitest file under `tests/` (dispatcher-level) or co-located
   under `src/commands/<tool>/tests/` (command-level, not yet wired into
   the default vitest include — see `vitest.config.ts`).

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run dev <tool> <command>` | Run without installing |
| `bun run build` | Type-check (`tsc --noEmit`) |
| `bun run check-types` | Alias for `build` |
| `bun run lint` | ESLint |
| `bun run test` | Vitest (dispatcher-level only) |

## Publishing

Publishing to npm is gated on the `@open-tomato` org registry being
configured. The workflow stub at
[`.github/workflows/publish.yml`](./.github/workflows/publish.yml) is
disabled via `if: false`; remove that line and uncomment the `on:` block
to enable once `NPM_TOKEN` is in place.

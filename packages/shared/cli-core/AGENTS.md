# AGENTS — packages/shared/cli-core

`@open-tomato/cli-core` — pure-TS contracts (`CliContext`, `CliCommand`, `CliEvent`,
`CliOutput`) plus the `assembleContext` helper that every `tomato`/`tomatops` command consumer
depends on. No command source, no business logic beyond argv parsing and output gating.

**Before working here:** read [`../../../AGENTS.md`](../../../AGENTS.md) (root umbrella) and
[`../../AGENTS.md`](../../AGENTS.md) (packages ecosystem). To scaffold/extend the package's
config or `src` files, load the
[`shared-package-authoring`](../../../skills/shared-package-authoring/SKILL.md) skill — cli-core
is its reference example.

## `parseArgs` contract (non-obvious — read before editing)

`parseArgs(argv: string[]) => { positional: string[]; flags: Record<string, string | boolean> }`.
There is **no flag-spec input**, so the parser can't intrinsically know whether a token is a
flag's value or a standalone positional. The adopted conventions (see `src/parseArgs.ts`):

| Input form | Result |
|---|---|
| `--name=value`, `-x=value` | `{ name: "value" }` (string) |
| `--name value` (next token doesn't start with `-`) | `{ name: "value" }`, and the value token is **consumed** (greedy) |
| `--name` (next token is a flag, or end-of-argv) | `{ name: true }` (boolean) |
| `--no-name` (length > 3) | `{ name: false }` — **negation prefix** |
| `--` | terminator: every following token is pushed to `positional` |
| bare token not starting with `-` | `positional` |

Consequences to keep in mind:

- **Greedy value consumption is ambiguous by design.** `--flag value` and `--flag` + positional
  `value` are indistinguishable without a spec; the parser always treats `value` as the flag's
  value. Tests asserting *boolean*-flag behavior must use unambiguous contexts (flag followed by
  another flag, or trailing flag) or they'll false-positive.
- **Flags deduplicate — last value wins** (`flags[name] = ...` overwrites). Repeatable-count
  semantics (`-v -v -v` → verbosity 3) **cannot** be derived from `flags`. A helper that needs a
  count must re-scan the raw `argv` itself (stop at `--`) and tally matching tokens.
- `--no-` negation only triggers for `--no-<name>` with `<name>` non-empty; `--no=...` and `--n`
  fall through to the normal value/boolean paths.

## `CliEvent` serialization constraint

The Grow Box TUI mirrors the `CliEvent` discriminated union in Rust, so the union must stay
serialization-friendly: string-literal `type` discriminator, **no class instances, no `Date`
objects** (use ISO-8601 strings for timestamps). Keep every variant round-trippable through
`JSON.stringify`/`parse` — there is a test asserting this in `src/events.test.ts`.

## See also

- [`shared-package-authoring`](../../../skills/shared-package-authoring/SKILL.md) — scaffold conventions & gotchas.
- [`../../AGENTS.md`](../../AGENTS.md) — package ecosystem orientation.

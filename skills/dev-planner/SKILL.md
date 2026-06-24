# dev-planner — Plan Document Format Specification

This skill specifies the format of plan documents produced for feature development work and consumed by the executor service (`services/executor`). It does not define agent behavior, personas, or workflow — those belong in agent profiles.

> For planning agent behavior and workflow, see the "Workflow Summary" section of [`AGENTS.md`](../../AGENTS.md).

---

## Files produced by a planning session

| File | Purpose |
| --- | --- |
| `PLAN.md` | Full task checklist with technical context, stage labels, and code examples |
| `PLAN_TRACKER.md` | Executor-parsed checklist; must use the exact format the parser expects |
| `PREREQUISITES.md` | Non-automatable setup steps required before the plan can run |

---

## PLAN.md format

`PLAN.md` is the human-readable plan. It is also passed to agents as context via `buildPrompt()` in `plan.ts`.

```markdown
# Plan: {Feature Title}

## Description

{Technical context and background. No behavioral instructions.}

# Stage: {Stage Name}
- [ ] Task one
- [ ] Task two

# Stage: {Next Stage}
- [ ] Task three
```

Rules:
- Stage labels use `# Stage: {name}` (top-level heading, not `##`).
- Tasks use `- [ ]` checkbox syntax.
- Keep PLAN.md focused on tasks and technical context only. Link to relevant `skills/` files where they clarify a task, but do not embed behavioral prose.
- Code snippets are allowed to illustrate a desired pattern. Keep them minimal and directly relevant to the task.
- Do not use words like "current", "previous", or "next" in task descriptions. The executor injects the task text directly into agent prompts; relative references confuse the agent about what has already been done.
- If the plan is long, add a `PLAN_SUMMARY.md` with a high-level overview of stages for quick reference.

---

## PLAN_TRACKER.md format

`PLAN_TRACKER.md` is consumed line-by-line by `findNextTask()` in `services/executor/src/loop/plan.ts`. The parser applies strict prefix matching — any deviation in syntax will cause tasks to be skipped or misread.

```markdown
# Stage: {Stage Name}

- [ ] Open task — not yet started
- [x] Completed task
- [BLOCKED] Blocked task — {reason why it is blocked}
```

### Parser format contract

| Status | Exact line prefix | Parser regex |
| --- | --- | --- |
| Unchecked | `- [ ] ` | `^- \[ \] (.+)` |
| Completed | `- [x] ` | `^- \[[ xX]\]` (counted only) |
| Blocked | `- [BLOCKED] ` | `^- \[BLOCKED\] (.+)` |

Important notes:
- `[BLOCKED]` uses uppercase only. `[blocked]` or `[Blocked]` will not be matched.
- There is one space between `]` and the task text for both `- [ ]` and `- [BLOCKED]`.
- Stage heading lines (`# Stage: ...`) are **not parsed** by the executor. They are visual separators only and do not affect task selection.
- `findNextTask()` prefers blocked tasks over unchecked ones — it resumes interrupted work before starting new tasks.

---

## PREREQUISITES.md format

`PREREQUISITES.md` lists non-automatable setup steps. It is not parsed by the executor — it is a human checklist.

```markdown
# Prerequisites

## Services
- [ ] {Service name} running on port {n}

## Environment Variables
- `VAR_NAME` — description and where to obtain it

## Credentials
- [ ] {Credential description}
```

Rules:
- Only include prerequisites that are genuinely non-automatable (installed services, external credentials, manual env var setup).
- Do not duplicate steps already documented in `README.md`, `AGENTS.md`, or `CONTRIBUTING.md`.
- For example: do not mark `bun install` as a prerequisite if the README already lists it as a required step for all development work.
- Link to `PREREQUISITES.md` from `PLAN.md`.

---

## Task granularity guidelines

- One atomic action per task. Each task must be completable in a single focused session without depending on another task being partially done.
- No compound tasks joined by "and". Split "implement X and write tests for X" into two tasks.
- Tasks must be independently completable in the order listed.
- Use imperative, specific wording: "Add Zod schema for `CreateJobRequest`" rather than "Handle input validation".

---

## Testing task insertion patterns

- Add a test task at the end of each stage at minimum.
- For large refactors or multi-file additions, add test tasks at smaller increments — logical sub-chunks that can be verified independently.
- Write negative tests before positive tests (error paths, early exits, edge cases).
- Write unit tests before integration tests.
- Place test tasks in the same stage as the code they cover, not in a separate testing stage.

---

## Versioning and publishing tasks (for publishable `@open-tomato/*` packages)

When a plan modifies one or more **publishable** packages (anything under `packages/shared/*`, `packages/service/*`, `packages/notifications/*`, `packages/agents/*`, or `packages/ui-skeleton` whose `package.json` has `private: false`), the plan **must** include a `# Stage: Release` section containing the changeset + publish lifecycle. These tasks are NOT optional — without them the work never reaches consumers.

Because the private registry (`npm.heimdall.bifemecanico.com`) is on the Grow Box network and unreachable from GitHub Actions, **package validation and publishing happen locally via the bun workspace**, not in CI. The plan must reflect this.

### Required tasks for any plan that touches a publishable package

Add these as the final stage, in this exact order:

```markdown
# Stage: Release
- [ ] Add a changeset describing the change: run `bunx changeset` and select the affected packages with the appropriate semver bump
- [ ] Run `bun run preflight --skip-changeset` from the repo root and verify it exits 0
- [ ] Run `bun run publish:dry` from the repo root and verify the tarball staging + publint validation pass
- [ ] Run `bun run publish:local` from the repo root to publish to the private registry
- [ ] Capture the new version in the changeset's commit message body
```

### Skip the Release stage when

- The plan only touches **private** workspace members (`private: true` in package.json — e.g., `cli`, `services/*`, `app`, `templates/*`, `types`). They never reach the registry.
- The plan is documentation-only or read-only.
- The plan explicitly says "internal-only iteration; consumer bump deferred to a follow-up release".

### Changeset granularity

- **One changeset per coherent unit of work**, not per task. A multi-stage plan that touches three packages produces one changeset listing all three.
- `patch` — bugfixes and internal refactors that don't change the public API
- `minor` — new features, new exports, or new optional parameters
- `major` — breaking changes (rare; document the migration path in the changeset body)
- **New package**: when a plan introduces a new `@open-tomato/*` package, include it in the changeset so version `0.1.0` is generated.

### Pre-publish gate (this replaces GitHub CI for package work)

`bun run publish:dry` runs the full pipeline locally: `turbo run build check-types test lint` then `preflight --skip-changeset` then `publish-packages.ts --dry-run` (which calls `publint` against the staged tarball). **Do not skip it.** If `publish:dry` fails, the work isn't done.

### External-consumer bump (when the published version unblocks downstream work)

If a published package version unblocks a downstream consumer (`auth/`, `knowledge-base/`, `token-monitor/`, `grow-box/`), add a separate `# Stage: Consumer bump` after `# Stage: Release`:

```markdown
# Stage: Consumer bump
- [ ] Bump @open-tomato/<pkg> in auth/package.json to ^<new-version>
- [ ] Run `cd auth && bun install` and verify standalone resolution
- [ ] Repeat for knowledge-base, token-monitor, grow-box/tools as applicable
```

Skip consumers that don't depend on the package in question. The bump is per-consumer because each repo has its own lockfile and may have additional constraints.

---

## `[BLOCKED]` marker

The `[BLOCKED]` marker is written by the executor when a task cannot complete. Format:

```text
- [BLOCKED] {task description} — {reason why it is blocked}
```

- The em dash (`—`) separates the task description from the reason. Do not use a hyphen (`-`) or colon.
- The full line including reason is passed back to the agent as the scoped task on the next run.
- Do not reformat `[BLOCKED]` lines manually unless correcting a syntax error — the executor will re-parse them on the next loop iteration.

---

## Format validation

Before changing checkbox syntax or stage heading format, verify compatibility against `findNextTask()` and `countTasks()` in `services/executor/src/loop/plan.ts`. The parser uses simple prefix regex matching with no tolerance for whitespace variations or casing differences (except `[x]` vs `[X]` in `countTasks`).

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

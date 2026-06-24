# Plans — Initiative Registry

This is the **authoritative status board** for all in-flight, planned, and historical initiatives in `open-tomato/`. Each row maps to a folder under `plans/`. Per-area `AGENTS.md` files should **link here** rather than restate roadmap status — that's how we keep them from drifting (the central failure mode the structural reorg is fixing).

## Active & pending

| Initiative                                            | Status                      | Areas                  | Linear                  | Last touched |
| ----------------------------------------------------- | --------------------------- | ---------------------- | ----------------------- | ------------ |
| [phase-8](./phase-8/INITIATIVE.md)                    | pending                     | packages, cli, cross-cutting | OPT-138, OPT-139, OPT-140 | 2026-06-24 |
| [structural-reorg](./structural-reorg/INITIATIVE.md)  | done                        | cross-cutting          | —                       | 2026-06-24   |
| [legacy-refactor](./refactor/README.md)               | done (00–08); pending (09)  | cross-cutting          | —                       | 2026-04-21   |

## Task-doc convention

All task docs under an initiative folder use YAML frontmatter:

| Field                  | Meaning                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                   | Stable identifier (e.g., `config-cli-04`), referenced by `depends-on` / `blocks` from other tasks |
| `linear`               | External Linear ticket ID (optional; `OPT-NNN` format)                                           |
| `initiative`           | Folder slug (must match parent dir)                                                              |
| `status`               | `pending` \| `in-progress` \| `done` \| `blocked` \| `abandoned`                                 |
| `area`                 | `packages` \| `cli` \| `services` \| `apps` \| `templates` \| `docs` \| `cross-cutting`          |
| `context.read-first`   | Files an agent MUST load before starting (paths relative to repo root)                            |
| `context.depends-on`   | Task `id`s that must complete first (use `<repo>:<path>` for cross-repo refs)                    |
| `context.blocks`       | Task `id`s that this unblocks (same namespacing rule)                                            |
| `verification`         | Command(s) that prove the task is done                                                           |

See [`_template/`](./_template/) for copy-paste skeletons.

### Why this format

The structural reorg's load-bearing failure was an agent loading wrong context — it pulled an `agents-config` migration plan when working on `config` service migration, because nothing told it which scope to load. The `context.read-first` list is the **explicit answer**: agents read what the task tells them to read, no naming-proximity guessing. The `depends-on` / `blocks` fields make cross-initiative handoffs grep-able and DAG-renderable.

## How to add an initiative

1. Copy `_template/INITIATIVE.md`, `_template/PREREQUISITES.md` (if needed), and `_template/00-task.md` into a new `plans/<slug>/` folder.
2. Fill in frontmatter and body.
3. Add a row to the table above.
4. If the initiative spans repos, the cross-repo namespacing in `depends-on` / `blocks` is `<repo-name>:<path>` (e.g., `grow-box:docs/phases/phase-8/PLAN-1.md`).

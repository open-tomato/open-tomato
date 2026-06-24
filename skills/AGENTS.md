# AGENTS — skills/

Claude skills — deep, actionable reference material agents load on demand. Moved into this repo from the umbrella `skills/` during the structural reorg (R-4).

**Before working here:** read [`../AGENTS.md`](../AGENTS.md) (umbrella + workflow).

## Available skills

| Skill | Topic |
| --- | --- |
| `api/` | API design patterns |
| `dev-planner/` | Development planning workflow |
| `documentation/` | Documentation patterns (openapi, tsdoc, typedoc-setup) |
| `drizzle-orm/` | Drizzle ORM patterns (connect, create tables, migrations, seeding) |
| `git-workflow/` | Git workflow conventions |
| `hive-learning/` | Hive learning patterns |
| `n8n-nodes/` | n8n node patterns and examples |
| `react-query/` | TanStack Query patterns |
| `releasing-packages/` | Package release workflow |
| `styling/` | Styling patterns |

## Skills vs rules vs AGENTS.md

- **Skills (here):** *how* to do specific things — deep reference material.
- **Rules (`~/.claude/rules/ecc/`):** universal principles and checklists (e.g., "80% test coverage", "no hardcoded secrets").
- **AGENTS.md files (throughout the tree):** scoped to one part of the repo — orientation, conventions, gotchas for that area.

## Adding a skill

Each skill is a folder containing a `SKILL.md` (or `SKILLS.md`) that an agent reads on demand. Optional `rules/` and `examples/` subdirs add depth.

## See also

- [`../AGENTS.md`](../AGENTS.md) — root umbrella
- [`../plans/INDEX.md`](../plans/INDEX.md) — initiative registry
- `~/.claude/rules/ecc/README.md` (outside this repo) — the rule layer

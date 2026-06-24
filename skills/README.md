# Skills

Claude skills relocated from `legacy-monorepo/skills/`. Each directory
contains a single entry file that a Claude Code session can load via the
Skill tool or the `claude-md-improver`/`hive-learning` workflows.

**Entry-file quirk:** `git-workflow/` uses `SKILLS.md` (plural) while
every other skill uses `SKILL.md` — do not "fix" this; the legacy naming
is load-bearing for skill auto-discovery in several tools.

## Index

| Skill | Path | Entry | Purpose | When to use |
|-------|------|-------|---------|-------------|
| api | [api/](./api/) | `SKILL.md` | REST API conventions (zod validation, response envelopes, JWT, pagination) | When designing or modifying HTTP endpoints in any service |
| dev-planner | [dev-planner/](./dev-planner/) | `SKILL.md` | Plan-document format consumed by the executor / orchestrator service | When producing a feature plan for execution by an agent loop |
| documentation | [documentation/](./documentation/) | `SKILL.md` | TSDoc, TypeDoc, OpenAPI/Swagger standards and infrastructure | When adding or updating auto-generated docs |
| drizzle-orm | [drizzle-orm/](./drizzle-orm/) | `SKILL.md` | Drizzle ORM patterns (migrations, schema conventions, queries) | When touching the database layer in any service |
| git-workflow | [git-workflow/](./git-workflow/) | `SKILLS.md` | Branching, push/PR conventions, `gh pr create` usage | When creating branches, pushing, or opening PRs |
| hive-learning | [hive-learning/](./hive-learning/) | `SKILL.md` | Hive learning sync protocol across agent instances (inherited/ vs personal/, blessed bundles) | When debugging or extending the learning-sync pipeline |
| n8n-nodes | [n8n-nodes/](./n8n-nodes/) | `SKILL.md` | n8n node catalogue and workflow generation patterns | When building or analyzing n8n workflows |
| react-query | [react-query/](./react-query/) | `SKILL.md` | React Query usage (`useQuery`, polling, cache keys, `@open-tomato/cache` integration) | When adding data fetching to a React app |
| releasing-packages | [releasing-packages/](./releasing-packages/) | `SKILL.md` | End-of-session release prep for `@open-tomato/*`: changeset summaries, version bumps, verify, publish to the private registry | At the end of a dev round when packages changed and you're ready to cut a release |
| styling | [styling/](./styling/) | `SKILL.md` | Open-Tomato-specific shadcn/radix/tailwind conventions | When styling components inside `open-tomato/app` or sibling frontends |

## Adding a new skill

1. Create `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`, `tags`).
2. Add a row to the index table above.
3. Keep the skill self-contained — any references outside the skill
   folder should be absolute GitHub URLs or relative paths into this
   umbrella tree, never into `legacy-monorepo/`.

# Contributing

Guidelines for human contributors working on the **open-tomato** monorepo.

---

## Dev environment setup

### Prerequisites

- **Bun** v1.3.9+ — runtime and package manager ([bun.sh](https://bun.sh))
- **Node** v22+ (required by some tooling)
- **bws** — Bitwarden Secrets Manager CLI (for projects that require secrets)
- **Docker** + Docker Compose — for the dev stack (postgres + services)

### Install dependencies

```bash
bun install
```

`bun install` resolves all shared libraries via `file:` references pointing at [`../packages/shared/*`](../packages/). Make sure the sibling `packages/` repo is present and has been installed at least once (`cd ../packages && bun install`) — otherwise the file references cannot resolve transitive deps.

### Environment variables

Projects that need environment variables ship an `.env.example`. Before running them:

```bash
cp .env.example .env
# Fill in the required values
```

To inject secrets from the vault at runtime:

```bash
bws run -- docker compose up
# or
bws run -- bun run dev
```

> Never commit `.env` files. They are (and must remain) in `.gitignore`.

### Run a project in dev mode

Every deliverable project supports:

```bash
bun run dev         # hot-reload development server
bun run test        # run tests
bun run build       # build/transpile
```

From the repo root you can target a specific workspace:

```bash
bun run dev --filter @open-tomato/app
bun run test --filter @open-tomato/notifications
```

Or run across all workspaces:

```bash
bun run build
```

### Run the full dev stack

```bash
bun run dev:stack          # docker compose up --build
# or
bash scripts/dev-stack.sh  # same, with explicit streaming logs
```

---

## Editor setup (VSCode)

Do **not** set `"eslint.workingDirectories"` — it interferes with ESLint autofix on save. Recommended settings:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "typescriptreact",
    "typescript",
    "javascript",
    "javascriptreact",
    "json",
    "markdown",
    "yaml"
  ],
  "eslint.useFlatConfig": true,
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true
}
```

---

## Code style

Style is enforced by ESLint. When in doubt, run `bun lint`.

### File and naming conventions

| Thing                                    | Convention                                                           |
| ---------------------------------------- | -------------------------------------------------------------------- |
| File names                               | `kebab-case` matching the export (`user-handler.ts` → `userHandler`) |
| Variables, functions                     | `camelCase`                                                          |
| Classes, types, interfaces               | `PascalCase`                                                         |
| Constant exports                         | `SCREAMING_SNAKE_CASE` (e.g., `USER_ROLES`)                          |
| Artifact names (Docker images, packages) | `lower-kebab-case`                                                   |
| Case-insensitive systems                 | `snake_case` as fallback                                             |

### Structure rules

- One core concern per file: one component, one controller, one handler, one domain entity.
- `index.ts` files are **only** for barrel re-exports — never for core logic.
- Avoid deep relative imports (`../../../clients`). Use path aliases defined in `tsconfig.json` (e.g., `@clients/`).
- Single-file concerns don't need a named directory (`src/controllers/user-controller.ts` instead of `src/controllers/user/index.ts`).
- Don't add prefix/suffix to types or interfaces (`UserParams`, not `IUserParams`).
- Don't use `any`. Use `unknown` and narrow with type guards.

### TypeScript and Zod

- Define request/response shapes as Zod schemas; derive TypeScript types with `z.infer<typeof Schema>`.
- Use `z.coerce` for query params (they arrive as strings), `z.enum()` for fixed string sets.
- Keep schemas strict — avoid `.passthrough()` unless explicitly needed.
- Shared types live in [`types/`](./types/) as `@open-tomato/repo-types`, or in a package under [`../packages/`](../packages/).

### Logging and errors

- Use `@open-tomato/logger` for structured logging.
- Throw domain-specific error classes (`NotFoundError`, `ValidationError`, etc.) from `@open-tomato/errors`.
- Pass a consistent JSON shape to error handlers: `{ error: string, code: string, details?: unknown }`.
- Never log passwords, tokens, or PII in any environment other than `development`.

---

## Testing

- **Runner**: Vitest (`bun run test`). Do not rely on bun's built-in test runner for project tests.
- **Unit tests**: co-locate next to source files as `<filename>.test.ts`.
- **Integration/e2e tests**: place in a `tests/` directory.
- Write negative/error-path tests first (early-exit pattern).
- Use `supertest` for Express controller tests — assert status codes, response shapes, and headers.
- Use mocks/stubs for external dependencies in unit tests.

---

## Branch, commit, and PR workflow

### Branch naming

Include the issue tracking ID:

```
feat/OPT-123-add-user-auth
fix/OPT-456-token-expiry
chore/OPT-789-update-dependencies
```

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: <scope> <description> [OPT-123]
fix: <scope> <description> [OPT-456]
refactor: <scope> <description>
chore: <scope> <description>
docs: <scope> <description>
test: <scope> <description>
```

- Write commits often with clear messages — don't squash everything into one commit.
- Do **not** include AI attribution in commit messages.

### Before opening a PR

```bash
bun lint            # must pass
bun run test        # must pass
bun run build       # or check-types — must pass
```

### PR checklist

- [ ] One feature, bug fix, or refactor per PR — keep it focused.
- [ ] Title follows conventional commits format and includes the issue ID.
- [ ] Description explains **what** changed and **why**.
- [ ] All tests pass, no lint errors.
- [ ] If a new endpoint is added: include example request/response in the description.
- [ ] If environment variables changed: `.env.example` is updated.
- [ ] At least one reviewer requested before merging.
- [ ] No PoC or incomplete work merged to `main` — use feature branches until ready.

### PR description template

```markdown
## What
Brief summary of the change.

## Why
Context and motivation (link to issue).

## How to test
Steps to verify the change manually if needed.

## Notes
Any breaking changes, env var updates, or migration steps.
```

---

## Working with shared libraries

- Shared libraries live in the sibling [`../packages/`](../packages/) repo.
- Reference them from this monorepo via `file:../../packages/shared/<name>` (or `file:../packages/shared/<name>` from the root).
- Rebuild packages first when making cross-repo changes: `cd ../packages && bun run build`.
- Once a package is published to the npm org, swap the `file:` ref for a semver range.
- Keep packages framework-agnostic. Platform-specific code goes in sub-exports (e.g., `@open-tomato/logger/react`).

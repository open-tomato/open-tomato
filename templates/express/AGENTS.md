# template-service-express — agent notes

This folder is a **template**, not a running service. It is the canonical
starting point for a new Express-based service in the open-tomato
ecosystem. When you adopt it, everything in `src/` is a baseline — replace
freely.

Umbrella context and conventions live in
[../AGENTS.md](../AGENTS.md). That file is authoritative for package
linking policy, commit format, and refactor deletion rules.

## Golden rules for edits to this folder

1. **Template, not service.** Do not add domain code here. If you find
   yourself writing business logic, you are probably meant to be in a
   concrete service repo.
2. **Keep `src/` minimal.** `index.ts` + `config.ts` + one router + the
   health test are the whole template. New patterns belong in `examples/`
   with a matching `docs/*.md` guide.
3. **Examples stay out of the TS program.** The `.example` suffix is the
   mechanism — don't add `examples/*.ts` or include it in `tsconfig.json`.
4. **Shared packages via `file:` refs.** Template consumers switch to
   published semver or GitHub refs when they adopt — see the README's
   "Adapting the template" section.
5. **Verify before commit.** `bun install && bun lint && bun run test &&
   bun run build` must stay green.

---
name: documentation
description: >
  Standards for auto-generated and inline documentation in the Open Tomato monorepo.
  Covers TypeDoc/TSDoc for TypeScript code, OpenAPI/Swagger for REST APIs,
  and documentation infrastructure (config files, gitignore, scripts).
tags: [tsdoc, typedoc, openapi, swagger, express, mcp, react]
---

# Documentation Skill

This skill defines how to document code in the Open Tomato monorepo.
Two kinds of documentation are maintained:

| Kind | Tool | Output | When to generate |
| --- | --- | --- | --- |
| **Code (TypeDoc)** | `typedoc` | `.docs/typedoc/` | `bun docs:generate` |
| **API (Swagger)** | `@asteasolutions/zod-to-openapi` + `swagger-ui-express` | `.docs/swagger/openapi.json` + served at `GET /docs` | `bun docs:generate` |

Manual documentation (ADRs, design notes) lives in `docs/` and is never gitignored.
Auto-generated outputs go in `.docs/` (dotfolder) and are always gitignored.

---

## Rules index

| Rule file | When to use |
| --- | --- |
| [`rules/tsdoc.md`](rules/tsdoc.md) | Writing TSDoc comments on any TypeScript symbol |
| [`rules/openapi.md`](rules/openapi.md) | Documenting Express routes with OpenAPI/Swagger |
| [`rules/typedoc-setup.md`](rules/typedoc-setup.md) | Adding TypeDoc infra to a new service or package |

---

## Workflow

1. **Determine kind before touching**: identify whether documentation is manual or auto-generated before editing. Manual docs live in `docs/`; auto-generated outputs live in `.docs/`.
2. **Manual docs**: include author and date in the file header. Never gitignore `docs/`.
3. **Auto-generated docs**: outputs go in `.docs/` (dotfolder). If adding a new documentation tool, add its output folder to `.gitignore`.
4. **Update in parallel**: update documentation before or in parallel with code changes — do not defer docs to a follow-up PR.

---

## Quick checklist

Before marking a documentation task done:

- [ ] Every exported function, class, and interface has a TSDoc block with `@param` and `@returns`.
- [ ] Every file has a `@packageDocumentation` comment (or is covered by a module-level JSDoc).
- [ ] Every Express router factory is documented with `@remarks` listing its HTTP endpoints.
- [ ] Every new service has `typedoc.json`, `tsconfig.docs.json`, and a `docs:generate` script.
- [ ] `src/openapi.ts` exists for Express services, and all routes are registered in it.
- [ ] `.docs/` is gitignored (root `.gitignore` covers it via the `.docs` and `services/**/.docs` patterns).
- [ ] `docs/` (manual ADRs) is **not** gitignored.
- [ ] `bun docs:generate` passes with 0 errors.

---

## Toolchain

```text
typedoc                          → HTML docs from TSDoc comments → .docs/typedoc/
@asteasolutions/zod-to-openapi   → OpenAPI spec from Zod schemas
swagger-ui-express               → Serves the spec at GET /docs at runtime
scripts/export-openapi.ts        → Writes .docs/swagger/openapi.json at build time
```

Dependencies go in `devDependencies` — the docs toolchain is not needed at runtime,
**except** `swagger-ui-express` when the service serves the UI at runtime (put it in `dependencies` in that case).

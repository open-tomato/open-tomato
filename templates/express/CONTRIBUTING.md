# Contributing to `template-service-express`

There are two distinct workflows depending on what you are trying to do.

## 1. Update the template

You want to improve the template itself — better defaults, a new opt-in
example, clearer docs, a shared-package upgrade.

- Work directly in this folder.
- Keep `src/` minimal (see [AGENTS.md](./AGENTS.md)). New patterns belong
  in `examples/` + `docs/`, not baked into the default service.
- Run the full gate before committing:

  ```sh
  bun install
  bun lint
  bun run test
  bun run build
  ```

- Commits follow the umbrella format: `<type>: <scope> <description>`
  (see [../AGENTS.md](../AGENTS.md)).

## 2. Adopt the template for a new service

You want to start a new Express service.

1. Copy the contents of this folder (excluding `.git/`) into a fresh repo:

   ```sh
   cp -R template-service-express/ ../my-new-service/
   cd ../my-new-service
   rm -rf .git
   git init
   ```

2. Rename `package.json#name` to your service's name.

3. Replace the `file:` refs to `@open-tomato/*` packages with the
   strategy appropriate for your context (published semver, GitHub ref,
   or a different relative path). See the README's "Adapting the
   template" section.

4. Replace `src/routes/example.ts` with your own routes. Use
   `tests/health.test.ts` as the template for further tests.

5. Opt into RPC / SSE / Drizzle as needed by copying the matching
   `examples/*.example` file into `src/`.

Do **not** try to keep the adopted service in sync with the template
after the fact — diverge freely.

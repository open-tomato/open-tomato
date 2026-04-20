---
title: "Diagnostics Agent Context"
description: "Package-specific gotchas and guidelines for diagnostics."
---

# Diagnostics — Agent Context

## Gotchas

- **`bun test` is the test runner** — `packages/diagnostics` uses `bun test` (not Vitest). Inspect the `"test"` script in `package.json` before writing tests; the runner affects import style and `vi.*` availability. Integration tests live in `packages/diagnostics/tests/diagnostics/integration.test.ts`.
- **Optional chaining argument evaluation order** — argument objects are evaluated before the optional chain resolves. `diag?.recordError({ sessionId: diag.currentSessionDir })` throws when `diag` is `null` because `diag.currentSessionDir` is evaluated first. Use `diag?.recordError({ sessionId: diag?.currentSessionDir ?? '' })` — optional-chain every access inside the argument object too.
- **`event as unknown as Record<string, unknown>` for TS2352** — casting a discriminated-union event directly to `Record<string, unknown>` fails with TS2352 when union members lack an index signature. The double cast (`as unknown as Record<string, unknown>`) is the correct fix; do not add index signatures to the event interfaces.
- **`diag.currentSessionDir` vs `diag?.currentSessionDir`** — call-site pattern when the collector is guarded: `const diag = DiagnosticsCollector.getInstance(); const sessionId = diag?.currentSessionDir ?? '';`. Pass `sessionId` into record calls rather than accessing `diag.currentSessionDir` inline.

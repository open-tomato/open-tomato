---
title: "Config Package Agent Context"
description: "Package-specific gotchas and guidelines for config."
---

# Config Package — Agent Context

## Gotchas

- **`HatCollectionSchema` enforces two cross-hat refinements**: (1) no two hats may share identical trigger lists (ambiguous routing), and (2) any `aggregate: true` hat requires at least one non-aggregate sibling in the same collection. Both constraints apply after merging collections as well — `mergeHatCollections` re-runs ambiguous routing detection on the result.
- **`loadConfig` applies env overrides in two passes**: first from `process.env` via `applyEnvOverrides`, then from `options.envOverride` by temporarily patching `process.env` and calling `applyEnvOverrides` again (save/restore pattern). This avoids duplicating env-var parsing logic but means overrides from `options.envOverride` are only visible after the second pass.
- **Integration test fixtures must satisfy `HatCollectionSchema`**: every hat collection fixture in `src/__fixtures__/` needs ≥1 hat, no duplicate trigger lists, and aggregate hats must have a non-aggregate sibling — otherwise loader tests fail schema validation before reaching the assertion under test.

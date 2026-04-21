# Link check — Plan 07.8

**Date:** 2026-04-21
**Tool:** `bunx markdown-link-check@3.14.2`
**Config:** `/tmp/mlc-config.json` (ignore external http(s):// and mailto:, 5 s timeout)
**Scope:** umbrella, skills, open-tomato, templates, tomato-cli. Excluded: `legacy-monorepo/`, `node_modules/`, `.git/`.

## Summary

| File | Links | Status |
|------|-------|--------|
| `../../../README.md` (umbrella) | 9 | ✓ |
| `../../../AGENTS.md` (umbrella) | 3 | ✓ |
| `../../../skills/README.md` | 9 | ✓ |
| `../../../skills/hive-learning/SKILL.md` | 3 | ✓ (after fixing `../../apps/orchestrator/AGENTS.md` → `../../open-tomato/services/orchestrator/AGENTS.md` and dropping the legacy-only research link) |
| `../../README.md` (open-tomato) | 9 | ✓ |
| `../../AGENTS.md` (open-tomato) | 6 | ✓ |
| `../../../template-service-express/README.md` | 7 | ✓ |
| `../../../template-service-express/AGENTS.md` | 1 | ✓ |
| `../../../template-service-express/CONTRIBUTING.md` | 2 | ✓ |
| `../../../template-service-mcp/README.md` | 8 | ✓ |
| `../../../template-service-mcp/AGENTS.md` | 1 | ✓ |
| `../../../tomato-cli/README.md` | 2 | ✓ |
| `../../../tomato-cli/AGENTS.md` | 1 | ✓ |
| `../../../tomato-cli/CONTRIBUTING.md` | 1 | ✓ |

**Total: 62 relative/in-repo links checked, 0 failures.**

## Fixes applied

- `skills/hive-learning/SKILL.md`:
  - `../../apps/orchestrator/AGENTS.md` → `../../open-tomato/services/orchestrator/AGENTS.md`
  - Removed link to `../../docs/hive-learning-research.md` (lives only in `legacy-monorepo/docs/` — deleted in Plan 09).
- `open-tomato/AGENTS.md`: dropped `<!-- TODO(07) -->` comment on the `../skills/` link; link itself was already correct.
- `open-tomato/README.md`: replaced `<!-- TODO(07): repoint to ../skills/... -->` row with a live `[../skills/](../skills/)` table entry.
- `AGENTS.md` (umbrella): updated the `skills/` row to link `skills/README.md` now that the index exists.

## Notes

- External `https://` links were skipped by the ignore-pattern to avoid flaky network-dependent results. Run without the ignore-pattern to validate external URLs when network quality allows.
- Every markdown file under `legacy-monorepo/` was excluded; that tree is frozen until Plan 09 deletes it and is not part of the post-split documentation surface.

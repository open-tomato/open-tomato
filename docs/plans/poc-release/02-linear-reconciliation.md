---
repo: linear (+ open-tomato read-only)
tier: milestone
depends-on: [00-master-plan]
parallel-with: [01, 03, 05]
size: S
status: blocked (needs issue-capable Linear connection)
linear: self
---

# WS02 — Linear roadmap reconciliation

**Goal:** the Linear Open-Tomato team board reflects reality, and every workstream in this plan exists as a Linear project/issue.

## Milestones

1. **Fix access**: current MCP connection exposes only release-management tools (releases/notes/status updates/agent skills — all empty) and no issue/project querying. Reconnect the full Linear MCP (`mcp.linear.app`) or fall back to the Linear GraphQL API / web export.
2. **Reconcile done work**: completed efforts (grow-box phases 0–6, component-breakdown primitives + auth epic, Phase-8 registry cut) moved to Done with descriptions.
3. **Retire superseded scope**: original roadmap items now covered by other projects (infra/CLI/low-level config per POC-RELEASE-PLANS "New objectives") closed or re-labelled.
4. **Mirror this plan**: one Linear project (or label) per workstream WS01–WS13; issue links written back into each doc's `linear:` frontmatter.
5. **Divergence report**: short summary of where local reality diverged from the original Linear roadmap (input for future planning).

## Cut-lines

- Fine-grained per-component issues are NOT required — workstream/session granularity is enough for PoC tracking.

## Verification

- Every `NN-*.md` doc has a non-TBD `linear:` value; board review with the user.

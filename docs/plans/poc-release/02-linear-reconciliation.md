---
repo: linear (+ open-tomato read-only)
tier: milestone
depends-on: [00-master-plan]
parallel-with: [01, 03, 05]
size: S
status: done (2026-07-22)
linear: OPT-241
---

# WS02 — Linear roadmap reconciliation

> Completed 2026-07-22: full Linear MCP reconnected; **PoC Release** project
> created with issues OPT-240…OPT-252 (WS01…WS13) + dependency relations.
> Reconciled done work: OPT-137/138/176 → Done (config standard, cli-core+CLI,
> config package — all published and in cross-repo use). Superseded scope:
> OPT-157/158 cancelled (→ ui-components/theme-default pipeline); "Migrate
> apps/toolbox-ui" + "Migrate apps/open-tomato" projects set Canceled (their
> descriptions already said so). Status updates posted on TomatOps (grow-box
> reality), Frontend Packages & Design System, apps/open-tomato Web App,
> Unified Documentation, Monorepo Deployment Pipelines, and Authentication
> Service. Left untouched: Expo/native track (OPT-159/191/192, post-PoC),
> OPT-139/140 (config CLI export/rollout — genuinely open), OPT-231/234 (CLI
> refinements), and all projects orthogonal to the PoC (executor/ralph/
> knowledge-base/notifications-plugin/events-ui/TUI/recruiter/n8n/Tessa/
> Workflows).

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

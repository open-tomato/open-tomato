# @open-tomato/prompt-builder

Assembles structured, token-aware prompts for the agent loop. Prompts are built each iteration from an ordered 10-section pipeline fed by live sources: memory store, skill registry, event bus, hat topology, guardrails, and the persisted objective.

## Installation

```bash
bun add @open-tomato/prompt-builder
```

## Overview

Prompts are not static strings — they are assembled dynamically each iteration from ordered sections. The assembly follows a fixed 10-section pipeline. Sections are rendered sequentially and joined with double newlines; sections that produce empty output are silently omitted.

## The 10-Section Pipeline

### Section 1 — Auto-Injected Skills

XML-tagged blocks injected at the top of every prompt. Includes memory data, tool documentation, the robot interaction skill, and any custom skills sourced from `PromptContext.skills`. Each skill is wrapped in its own XML tag (e.g., `<memory_data>…</memory_data>`) so the model can parse skill boundaries unambiguously.

### Section 2 — Core Prompt

Four structured sub-blocks rendered in order:

- **ORIENTATION** — Agent identity and a fresh-context reminder, ensuring the agent does not carry implicit assumptions from previous turns.
- **SCRATCHPAD** — A designated space for intermediate reasoning steps.
- **STATE MANAGEMENT** — Instructions for how to persist and restore state across iterations.
- **GUARDRAILS** — Behavioral rules encoded as RFC 2119 numbered entries (see [`GuardrailsRegistry`](#guardrailsregistry) below).

### Section 3 — Skill Index

A compact Markdown table listing every available skill with three columns: `id`, `name`, and a one-line description. This gives the agent a quick reference to all capabilities without embedding the full skill documentation inline.

### Section 4 — Objective

The user's original goal, verbatim. This section **persists unchanged across all iterations** — the objective is never cleared or modified during a session. The caller is responsible for providing the same value on every `build()` call.

### Section 5 — Robot Guidance

A numbered list of human guidance messages sourced from `PromptContext.robotGuidance`. The **caller is responsible for clearing this list** after prompt assembly; the section itself does not mutate the context. When the array is empty the section produces no output.

### Section 6 — Pending Events

A formatted list of events the agent must handle, prefixed with the instruction "You MUST handle the following events:". Sourced from `PromptContext.pendingEvents`. When the array is empty the section produces no output.

### Section 7 — Workflow

The workflow rendered depends on how many hats are active:

| Active hats | Workflow | Steps |
|-------------|----------|-------|
| `> 1` (multi-hat) | PLAN → DELEGATE | Decompose objective into tasks, emit delegation events. Includes a fast-path hint for direct delegation when no decomposition is needed. |
| `≤ 1` (solo) | STUDY → PLAN → IMPLEMENT → VERIFY → REPEAT | Full iterative loop: study the objective and events, plan steps, implement, verify against acceptance criteria, repeat if needed. |

### Section 8 — Hats Section

Three components rendered in order:

1. **Topology table** — Markdown table with columns: Hat ID, Role, Publishes, Subscribes.
2. **Data-flow description** — Textual summary of how events flow between hats, derived from publish/subscribe topic matching.
3. **Active-hat instructions** — Full instruction text for each hat, **filtered to only the hats listed in `activeHatIds`**. Instructions for inactive hats are never included, keeping the prompt focused.

Reachability validation is performed when more than one hat is active: each active hat must be able to reach at least one other hat or a terminal via published topics.

### Section 9 — Event Writing

Static rules governing how the agent should emit events. This section has no dynamic content — it renders identically regardless of context.

### Section 10 — Done

A completion checklist the agent must satisfy before declaring an iteration complete. Includes task verification steps such as confirming the objective is met, all pending events have been handled, and required state has been persisted.

---

## Token Budget Strategy

The assembled prompt targets **40–60% of the usable context window** (~176 K tokens). Staying within this range — the "smart zone" — leaves sufficient room for the model's reasoning and response without wasting context on oversized prompts.

### How truncation works

Memory blocks are the only variable-length content that may exceed budget. Truncation follows two rules:

1. **Block boundary** — content is split on double newlines (`\n\n`). A block is included only if it fits entirely; no block is split mid-sentence.
2. **Greedy accumulation** — blocks are added in priority order until the next candidate would exceed the budget, then loading stops.

### `TokenBudgetManager`

Tracks per-section token consumption. Sections report their token count after rendering via `consume()`; the manager accumulates totals and exposes two helpers:

- `remaining()` — tokens left in the total budget (clamped to 0).
- `withinSmartZone()` — returns `true` when total consumed tokens fall within `[targetMinPercent, targetMaxPercent]` of `totalTokens`.

Use `buildWithBudget()` instead of `build()` when you need consumption tracking:

```typescript
const budget = new TokenBudgetManager({
  totalTokens: 176_000,
  targetMinPercent: 40,
  targetMaxPercent: 60,
  maxForSection: () => 10_000,
});

const prompt = await builder.buildWithBudget(context, budget);

console.log(budget.remaining());       // tokens left
console.log(budget.withinSmartZone()); // true if 40–60 % filled
```

---

## Public API

### `PromptBuilder`

Accepts an ordered array of `PromptSection` instances and assembles them into a single prompt string.

```typescript
import { PromptBuilder, createDefaultPromptBuilder } from '@open-tomato/prompt-builder';

// Use the default 10-section pipeline
const builder = createDefaultPromptBuilder();
const prompt = await builder.build(context);
```

### `createDefaultPromptBuilder(overrides?)`

Factory that wires all 10 sections in the correct order. Each section can be replaced independently for testing or custom deployments:

```typescript
const builder = createDefaultPromptBuilder({
  objective: new MyCustomObjectiveSection(),
});
```

### `PromptSection` interface

```typescript
interface PromptSection {
  name: string;
  render(context: PromptContext): string | Promise<string>;
}
```

### `PromptContext` type

Contains all live data sources consumed during assembly:

| Field | Type | Description |
|-------|------|-------------|
| `hatId` | `string` | The current hat identity |
| `objective` | `string` | User's original goal (persists across iterations) |
| `robotGuidance` | `string[]` | Human guidance messages (caller clears after assembly) |
| `pendingEvents` | `PendingEvent[]` | Events the agent must handle this iteration |
| `memories` | `MemoryBlock[]` | Memory blocks to inject in Section 1 |
| `skills` | `SkillManifest[]` | Skills available for Section 1 and Section 3 |
| `guardrails` | `GuardrailsRegistry` | RFC 2119 rules rendered in Section 2 |
| `hats` | `HatDefinition[]` | Full hat topology for Section 8 |
| `activeHatIds` | `string[]` | Hats active this iteration (drives Section 7 and Section 8 filtering) |
| `tokenBudget` | `TokenBudget` | Budget parameters used by `buildWithBudget` |

### `TokenBudgetManager`

Tracks consumed tokens per section and exposes `remaining()` and `withinSmartZone()`.

### `GuardrailsRegistry`

Append-only ordered list of RFC 2119 guardrail rules. Rules cannot be removed once added, ensuring the GUARDRAILS block is never empty. Use `defaultGuardrails()` for the baseline set:

```typescript
import { defaultGuardrails } from '@open-tomato/prompt-builder';

const registry = defaultGuardrails();
registry.add({ level: 'MUST', rule: 'Ask for confirmation before deleting data.' });
console.log(registry.toPromptText());
// 1. MUST: Complete only the task described in the OBJECTIVE section…
// …
// 8. MUST: Ask for confirmation before deleting data.
```

The default set includes seven baseline rules covering scope, secrecy, state persistence, destructive actions, minimal side-effects, event handling, and topic constraints.

### `HatTopologyRenderer`

Renders the hat topology table, validates reachability, and filters instructions to active hats:

```typescript
import { HatTopologyRenderer } from '@open-tomato/prompt-builder';

const renderer = new HatTopologyRenderer();
const table = renderer.renderTable(hats);
const filtered = renderer.filterInstructions(hats, activeHatIds);
const result = renderer.validateReachability(topology, activeHatIds);
```

### `BudgetedMemoryLoader`

Wraps a raw memory source and stops loading blocks once the token budget is exhausted. Truncation happens at block boundaries; the `tokenCount` on returned blocks always reflects the actual (possibly truncated) content.

```typescript
import { BudgetedMemoryLoader } from '@open-tomato/prompt-builder';

const loader = new BudgetedMemoryLoader(rawSource, counter);
const blocks = await loader.load(maxTokens);
```

### `XmlSkillFormatter` and `SkillIndexFormatter`

Format skill manifests for Section 1 (XML-wrapped) and Section 3 (Markdown table) respectively.

---

## Architecture Notes

- **Shared types** (`GuardrailRule`, `HatDefinition`, `HatTopology`, `MemoryBlock`, `PendingEvent`, `SkillManifest`) live in `@open-tomato/types` and are re-exported from this package for convenience.
- **Prompt-assembly internals** (`PromptSection`, `PromptContext`, `TokenBudget`) are defined locally in `src/types/`.
- The tokenizer uses `gpt-tokenizer` (cl100k_base, ~±5% approximation for Claude) with a character-based fallback (~4 chars/token).

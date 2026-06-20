/**
 * Public entry point for `@open-tomato/prompt-builder`.
 *
 * Assembles structured, token-aware prompts for the agent loop from ordered
 * sections fed by live sources: memory store, skill registry, event bus,
 * hat topology, guardrails, and the persisted objective.
 */

export type {
  GuardrailLevel,
  GuardrailRule,
  HatDefinition,
  HatTopology,
  MemoryBlock,
  PendingEvent,
  PromptContext,
  PromptSection,
  SkillManifest,
  TokenBudget,
} from './types/index.js';

export { TokenBudgetManager, truncateToTokenBudget } from './token-budget/index.js';
export { TokenCounter } from './token-counter.js';

export {
  AutoInjectedSkillsSection,
  CorePromptSection,
  DoneSection,
  EventWritingSection,
  HatsSection,
  ObjectiveSection,
  PendingEventsSection,
  RobotGuidanceSection,
  SkillIndexSection,
  WorkflowSection,
} from './sections/index.js';

export {
  PromptBuilder,
  createDefaultPromptBuilder,
} from './prompt-builder.js';
export type { DefaultPromptBuilderOverrides } from './prompt-builder.js';

export { GuardrailsRegistry, defaultGuardrails } from './guardrails/registry.js';

export { HatTopologyRenderer } from './hats/topology-renderer.js';
export type { ValidationResult } from './hats/topology-renderer.js';

export { BudgetedMemoryLoader } from './memory/budgeted-memory-loader.js';
export type { RawMemorySource } from './memory/budgeted-memory-loader.js';
export type { MemoryLoader } from './memory/types.js';

export type { SkillSource } from './skills/types.js';
export type { EventSource } from './events/types.js';
export { XmlSkillFormatter } from './skills/xml-skill-formatter.js';
export { SkillIndexFormatter } from './skills/skill-index-formatter.js';
export { PendingEventFormatter } from './events/pending-event-formatter.js';

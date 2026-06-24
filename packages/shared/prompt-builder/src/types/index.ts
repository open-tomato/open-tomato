/**
 * Core types for the `@open-tomato/prompt-builder` package.
 *
 * Shared domain types (`GuardrailRule`, `HatDefinition`, `HatTopology`,
 * `MemoryBlock`, `PendingEvent`, `SkillManifest`) are re-exported from
 * `@open-tomato/types` so consumers only need one import path. Only
 * types that are internal to the prompt assembly pipeline are defined here.
 */

// Re-export shared domain types from the canonical location.
export type {
  GuardrailLevel,
  GuardrailRule,
  HatDefinition,
  HatTopology,
  MemoryBlock,
  PendingEvent,
  SkillManifest,
} from '@open-tomato/types';

import type {
  GuardrailRule,
  HatDefinition,
  MemoryBlock,
  PendingEvent,
  SkillManifest,
} from '@open-tomato/types';

// ─── Prompt-assembly-specific types ──────────────────────────────────────────

/**
 * Token budget configuration and per-section limit helper.
 */
export interface TokenBudget {
  /** Total usable tokens in the context window. */
  totalTokens: number;

  /**
   * Lower bound of the target fill range as a percentage of `totalTokens`
   * (e.g. `40` = 40 %).
   */
  targetMinPercent: number;

  /**
   * Upper bound of the target fill range as a percentage of `totalTokens`
   * (e.g. `60` = 60 %).
   */
  targetMaxPercent: number;

  /**
   * Returns the maximum number of tokens a named section may consume.
   *
   * @param section - The section name as registered in {@link PromptSection.name}.
   */
  maxForSection(section: string): number;
}

/**
 * Execution context passed to every {@link PromptSection} during prompt
 * assembly.
 *
 * Fields are populated by the caller before invoking {@link PromptBuilder.build}
 * and represent the live state of the agent loop at that iteration.
 */
export interface PromptContext {
  /**
   * Identifier of the hat that is currently active and driving this prompt
   * assembly iteration.
   */
  hatId: string;

  /**
   * The user's original goal. This value persists unchanged across all
   * iterations and MUST NOT be mutated by any section renderer.
   */
  objective: string;

  /**
   * Numbered list of human guidance messages to inject into Section 5.
   * The caller is responsible for clearing this array after prompt assembly.
   */
  robotGuidance: string[];

  /**
   * Events the agent MUST handle in this iteration, injected into Section 6.
   * Only events addressed to {@link hatId} should be included.
   */
  pendingEvents: PendingEvent[];

  /**
   * Memory blocks to inject into the prompt, ordered by priority.
   * The {@link TokenBudget} governs how many blocks are actually rendered.
   */
  memories: MemoryBlock[];

  /**
   * Skills available to the agent in this iteration, rendered in Sections 1
   * and 3.
   */
  skills: SkillManifest[];

  /**
   * Ordered list of guardrail rules rendered as the RFC2119 numbered list in
   * Section 2 (GUARDRAILS block).
   */
  guardrails: GuardrailRule[];

  /**
   * Full hat topology used by Section 8 to render the topology table and
   * validate reachability.
   */
  hats: HatDefinition[];

  /**
   * Ids of hats that are currently active. Sections use this to filter hat
   * instructions (only active hats appear) and to choose the workflow mode
   * (solo vs. multi-hat).
   */
  activeHatIds: string[];

  /**
   * Token budget governing overall prompt length and per-section limits.
   * The target range is 40–60 % of the usable context window (~176 K tokens).
   */
  tokenBudget: TokenBudget;
}

/**
 * A single named section of the assembled prompt.
 *
 * Sections are rendered in the order they are added to {@link PromptBuilder}
 * and joined with double newlines. A section may return an empty string to
 * exclude itself from the final output (e.g. when its source data is absent).
 *
 * @example
 * ```typescript
 * class ObjectiveSection implements PromptSection {
 *   readonly name = 'objective';
 *
 *   render(context: PromptContext): string {
 *     return `## OBJECTIVE\n\n${context.objective}`;
 *   }
 * }
 * ```
 */
export interface PromptSection {
  /** Unique, human-readable identifier for this section (used in debugging). */
  readonly name: string;

  /**
   * Renders the section content given the current prompt context.
   *
   * Implementations MUST return an empty string rather than `null` or
   * `undefined` when the section has no content to contribute.
   *
   * @param context - The current prompt assembly context.
   * @returns The rendered section text, or a promise resolving to it.
   */
  render(context: PromptContext): string | Promise<string>;
}

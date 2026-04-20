import type { PromptContext, PromptSection } from './types/index.js';

import {
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
import { TokenBudgetManager } from './token-budget/index.js';
import { TokenCounter } from './token-counter.js';

/**
 * Assembles a structured prompt from an ordered list of {@link PromptSection}
 * instances.
 *
 * Sections are rendered sequentially and joined with double newlines. Empty
 * section output is filtered out so no blank blocks appear in the assembled
 * prompt.
 *
 * @example
 * ```typescript
 * const builder = new PromptBuilder([
 *   new ObjectiveSection(),
 *   new CorePromptSection(),
 * ]);
 *
 * const prompt = await builder.build(context);
 * ```
 */
export class PromptBuilder {
  private readonly sections: PromptSection[];

  /**
   * @param sections - Ordered array of sections to include in the assembled
   *   prompt. Sections are rendered in the order provided.
   */
  constructor(sections: PromptSection[]) {
    this.sections = sections;
  }

  /**
   * Renders all sections sequentially, filters empty strings, and joins the
   * results with double newlines.
   *
   * @param context - The current prompt assembly context.
   * @returns The assembled prompt string.
   */
  async build(context: PromptContext): Promise<string> {
    const parts: string[] = [];

    for (const section of this.sections) {
      const rendered = await section.render(context);
      if (rendered) {
        parts.push(rendered);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Renders all sections sequentially while tracking token consumption via
   * the provided {@link TokenBudgetManager}.
   *
   * After each section is rendered its token count is recorded under the
   * section's name. Empty section output is still filtered out.
   *
   * @param context - The current prompt assembly context.
   * @param budget - The token budget manager used to track consumption.
   * @returns The assembled prompt string.
   */
  async buildWithBudget(
    context: PromptContext,
    budget: TokenBudgetManager,
  ): Promise<string> {
    const counter = new TokenCounter();
    const parts: string[] = [];

    for (const section of this.sections) {
      const rendered = await section.render(context);
      if (rendered) {
        budget.consume(section.name, counter.count(rendered));
        parts.push(rendered);
      }
    }

    return parts.join('\n\n');
  }
}

/**
 * Optional overrides for individual sections in
 * {@link createDefaultPromptBuilder}.
 *
 * Each key corresponds to one of the 10 canonical section positions. Providing
 * a value replaces the default section at that position; omitting a key keeps
 * the default.
 */
export interface DefaultPromptBuilderOverrides {
  /** Override for Section 1 — Auto-Injected Skills. */
  autoInjectedSkills?: PromptSection;
  /** Override for Section 2 — Core Prompt. */
  corePrompt?: PromptSection;
  /** Override for Section 3 — Skill Index. */
  skillIndex?: PromptSection;
  /** Override for Section 4 — Objective. */
  objective?: PromptSection;
  /** Override for Section 5 — Robot Guidance. */
  robotGuidance?: PromptSection;
  /** Override for Section 6 — Pending Events. */
  pendingEvents?: PromptSection;
  /** Override for Section 7 — Workflow. */
  workflow?: PromptSection;
  /** Override for Section 8 — Hats. */
  hats?: PromptSection;
  /** Override for Section 9 — Event Writing. */
  eventWriting?: PromptSection;
  /** Override for Section 10 — Done. */
  done?: PromptSection;
}

/**
 * Creates a {@link PromptBuilder} pre-wired with all 10 canonical sections in
 * the correct pipeline order.
 *
 * Individual sections can be swapped out via the optional `overrides` argument,
 * which is useful for testing or custom deployments where a specific section
 * should behave differently without rebuilding the entire pipeline.
 *
 * The 10-section order is:
 * 1. Auto-Injected Skills
 * 2. Core Prompt
 * 3. Skill Index
 * 4. Objective
 * 5. Robot Guidance
 * 6. Pending Events
 * 7. Workflow
 * 8. Hats
 * 9. Event Writing
 * 10. Done
 *
 * @param overrides - Optional per-section replacements.
 * @returns A fully configured {@link PromptBuilder}.
 */
export function createDefaultPromptBuilder(
  overrides: DefaultPromptBuilderOverrides = {},
): PromptBuilder {
  const sections: PromptSection[] = [
    overrides.autoInjectedSkills ?? new AutoInjectedSkillsSection(),
    overrides.corePrompt ?? new CorePromptSection(),
    overrides.skillIndex ?? new SkillIndexSection(),
    overrides.objective ?? new ObjectiveSection(),
    overrides.robotGuidance ?? new RobotGuidanceSection(),
    overrides.pendingEvents ?? new PendingEventsSection(),
    overrides.workflow ?? new WorkflowSection(),
    overrides.hats ?? new HatsSection(),
    overrides.eventWriting ?? new EventWritingSection(),
    overrides.done ?? new DoneSection(),
  ];

  return new PromptBuilder(sections);
}

import type { GuardrailRule, PromptContext, PromptSection } from '../types/index.js';

/**
 * Formats a single guardrail rule as an RFC2119 numbered entry.
 *
 * @param rule - The guardrail rule to format.
 * @returns A string of the form `N. LEVEL: rule text`.
 */
function formatGuardrailRule(rule: GuardrailRule): string {
  return `${rule.index}. ${rule.level}: ${rule.rule}`;
}

/**
 * Section 2 — Core Prompt.
 *
 * Renders four blocks that form the agent's foundational instructions:
 *
 * - **ORIENTATION** — identity declaration and fresh-context reminder so the
 *   agent knows it is starting from a clean slate each iteration.
 * - **SCRATCHPAD** — an explicit invitation for the agent to reason before
 *   acting, keeping thinking visible and auditable.
 * - **STATE MANAGEMENT** — guidance on how to track and update shared state
 *   across iterations without relying on conversation history.
 * - **GUARDRAILS** — the RFC2119 numbered rule list sourced from
 *   {@link PromptContext.guardrails}. Always rendered, even when the
 *   guardrails array is empty (the block header is still present so downstream
 *   consumers can reliably parse the structure).
 *
 * @example
 * ```typescript
 * const section = new CorePromptSection();
 * const output = section.render(context);
 * // ## ORIENTATION
 * // ...
 * // ## SCRATCHPAD
 * // ...
 * // ## STATE MANAGEMENT
 * // ...
 * // ## GUARDRAILS
 * // 1. MUST: ...
 * ```
 */
export class CorePromptSection implements PromptSection {
  readonly name = 'core-prompt';

  /**
   * Renders the four core blocks given the current prompt context.
   *
   * @param context - The current prompt assembly context.
   * @returns The rendered core prompt text.
   */
  render(context: PromptContext): string {
    const orientation = [
      '## ORIENTATION',
      '',
      'You are an autonomous agent operating within a structured multi-hat system. '
      + 'Your identity and role are defined by the active hat assigned to you for this iteration.',
      '',
      'Each iteration begins with a fresh context. You do not have access to previous '
      + 'conversation turns or prior reasoning. Everything you need to act is provided '
      + 'in this prompt. Read it fully before taking any action.',
    ].join('\n');

    const scratchpad = [
      '## SCRATCHPAD',
      '',
      'Before taking any action, reason through the task step by step. '
      + 'Write out your thinking explicitly — what you know, what is unclear, '
      + 'what you plan to do, and why. Visible reasoning improves decision quality '
      + 'and makes your process auditable.',
    ].join('\n');

    const stateManagement = [
      '## STATE MANAGEMENT',
      '',
      'You cannot rely on conversation history to track state between iterations. '
      + 'All persistent state MUST be written to the shared event bus or a designated '
      + 'memory store before this iteration ends. State that is not externalised is lost.',
      '',
      'When reading state, treat values from the event bus and memory blocks as the '
      + 'authoritative source of truth. Do not assume prior context exists.',
    ].join('\n');

    const guardrailsBlock = this.renderGuardrails(context.guardrails);

    return [orientation, scratchpad, stateManagement, guardrailsBlock].join('\n\n');
  }

  /**
   * Renders the GUARDRAILS block from the ordered guardrail rule list.
   *
   * @param rules - The guardrail rules from the prompt context.
   * @returns The formatted GUARDRAILS block.
   */
  private renderGuardrails(rules: GuardrailRule[]): string {
    const header = '## GUARDRAILS';

    if (rules.length === 0) {
      return header;
    }

    const ruleLines = rules.map(formatGuardrailRule).join('\n');
    return `${header}\n\n${ruleLines}`;
  }
}

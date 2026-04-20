/**
 * RFC2119 keyword governing when a guardrail rule applies.
 *
 * @see {@link GuardrailRule}
 */
export type GuardrailLevel = 'MUST' | 'MUST NOT' | 'SHOULD' | 'SHOULD NOT' | 'MAY';

/**
 * A single behavioral constraint rendered as a numbered RFC2119 rule.
 *
 * @remarks
 * Rules are append-only and auto-indexed by the guardrails registry in
 * `@open-tomato/prompt-builder`.
 */
export interface GuardrailRule {
  /** Sequential 1-based index assigned by the registry. */
  index: number;

  /** RFC2119 obligation level for this rule. */
  level: GuardrailLevel;

  /** Human-readable rule text (no trailing period required). */
  rule: string;
}

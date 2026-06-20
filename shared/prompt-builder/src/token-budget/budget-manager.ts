import type { TokenBudget } from '../types/index.js';

/**
 * Tracks token consumption across prompt sections and reports budget health.
 *
 * Consumers call {@link consume} after each section is rendered; the manager
 * accumulates section totals and exposes helpers for checking whether the
 * assembled prompt falls within the intended token budget range.
 *
 * @example
 * ```typescript
 * const manager = new TokenBudgetManager({
 *   totalTokens: 176_000,
 *   targetMinPercent: 40,
 *   targetMaxPercent: 60,
 *   maxForSection: () => 10_000,
 * });
 *
 * manager.consume('objective', 120);
 * manager.consume('guardrails', 480);
 *
 * manager.remaining();        // 176_000 - 600 = 175_400
 * manager.withinSmartZone();  // false — well below 40 %
 * ```
 */
export class TokenBudgetManager {
  private readonly budget: TokenBudget;
  private readonly sectionTotals = new Map<string, number>();

  constructor(budget: TokenBudget) {
    this.budget = budget;
  }

  /**
   * Records that `tokens` tokens were consumed by the named section.
   *
   * Calling this multiple times for the same section accumulates the totals
   * (useful when a section renders incrementally).
   *
   * @param section - The section name as registered in {@link PromptSection.name}.
   * @param tokens - The number of tokens consumed (must be ≥ 0).
   */
  consume(section: string, tokens: number): void {
    const previous = this.sectionTotals.get(section) ?? 0;
    this.sectionTotals.set(section, previous + tokens);
  }

  /**
   * Returns the number of tokens remaining in the total budget.
   *
   * The value is clamped to 0 — it never goes negative even if sections have
   * over-consumed.
   *
   * @returns Remaining tokens (≥ 0).
   */
  remaining(): number {
    return Math.max(0, this.budget.totalTokens - this.totalConsumed());
  }

  /**
   * Returns `true` when the total consumed tokens fall within the target
   * percentage range defined by {@link TokenBudget.targetMinPercent} and
   * {@link TokenBudget.targetMaxPercent}.
   *
   * A prompt is considered "within the smart zone" when it fills between the
   * lower and upper bounds of the desired context window utilisation.
   *
   * @returns `true` if `targetMinPercent ≤ fill% ≤ targetMaxPercent`.
   */
  withinSmartZone(): boolean {
    const fillPercent = (this.totalConsumed() / this.budget.totalTokens) * 100;
    return (
      fillPercent >= this.budget.targetMinPercent &&
      fillPercent <= this.budget.targetMaxPercent
    );
  }

  /** Sum of all section token totals. */
  private totalConsumed(): number {
    let total = 0;
    for (const tokens of this.sectionTotals.values()) {
      total += tokens;
    }
    return total;
  }
}

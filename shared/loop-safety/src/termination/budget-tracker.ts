/**
 * Configuration options for {@link BudgetTracker}.
 */
export interface BudgetTrackerConfig {
  /** Maximum allowed cumulative cost in USD before the budget is considered exceeded. */
  maxCostUsd: number;
}

/**
 * Tracks cumulative API cost accumulation and enforces a USD budget limit.
 *
 * Costs are added incrementally via {@link addCost}. When the accumulated
 * total reaches or exceeds `maxCostUsd`, {@link isExceeded} returns `true`
 * to signal that termination should be considered.
 */
export class BudgetTracker {
  private accumulatedCostUsd = 0;

  constructor(private readonly config: BudgetTrackerConfig) {}

  /**
   * Add a cost increment to the accumulated total.
   *
   * @param usd - The cost amount in USD to add. Must be a non-negative number.
   */
  addCost(usd: number): void {
    this.accumulatedCostUsd += usd;
  }

  /**
   * Returns `true` when the accumulated cost has reached or exceeded
   * the configured `maxCostUsd` limit; `false` otherwise.
   */
  isExceeded(): boolean {
    return this.accumulatedCostUsd >= this.config.maxCostUsd;
  }

  /**
   * The current accumulated cost in USD.
   */
  get totalCost(): number {
    return this.accumulatedCostUsd;
  }
}

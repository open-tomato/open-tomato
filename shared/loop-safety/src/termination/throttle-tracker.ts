/**
 * Configuration options for {@link ThrottleTracker}.
 */
export interface ThrottleTrackerConfig {
  /** Number of blocks before a task is considered abandoned. Default: 3. */
  blockThreshold: number;
  /** Number of abandoned-task redispatches before thrashing is declared. Default: 3. */
  redispatchThreshold: number;
}

const DEFAULT_CONFIG: ThrottleTrackerConfig = {
  blockThreshold: 3,
  redispatchThreshold: 3,
};

/**
 * Tracks `build.blocked` events and abandoned-task redispatches to detect
 * loop thrashing.
 *
 * A task is considered **abandoned** once it has accumulated `blockThreshold`
 * block events. Each time the planner redispatches an abandoned task the
 * redispatch counter increments. When the redispatch counter reaches
 * `redispatchThreshold`, {@link isThrashing} returns `true`.
 */
export class ThrottleTracker {
  private readonly config: ThrottleTrackerConfig;
  private blockCounts = new Map<string, number>();
  private abandonedTasks = new Set<string>();
  private redispatchCount = 0;

  constructor(config: Partial<ThrottleTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record a `build.blocked` event for a task.
   *
   * @returns `true` on the exact iteration the task crosses the block
   *   threshold and becomes abandoned; `false` otherwise.
   */
  recordBlock(taskId: string): boolean {
    if (this.abandonedTasks.has(taskId)) {
      return false;
    }

    const current = (this.blockCounts.get(taskId) ?? 0) + 1;
    this.blockCounts.set(taskId, current);

    if (current >= this.config.blockThreshold) {
      this.abandonedTasks.add(taskId);
      return true;
    }

    return false;
  }

  /**
   * Record that the planner redispatched a task.
   *
   * The counter only increments when `taskId` is in the abandoned set.
   *
   * @returns The current redispatch count.
   */
  recordRedispatch(taskId: string): number {
    if (!this.abandonedTasks.has(taskId)) {
      return this.redispatchCount;
    }

    this.redispatchCount += 1;
    return this.redispatchCount;
  }

  /**
   * Returns `true` when the number of abandoned-task redispatches has reached
   * or exceeded `redispatchThreshold`.
   */
  isThrashing(): boolean {
    return this.redispatchCount >= this.config.redispatchThreshold;
  }

  /** Reset all internal state. */
  reset(): void {
    this.blockCounts.clear();
    this.abandonedTasks.clear();
    this.redispatchCount = 0;
  }
}

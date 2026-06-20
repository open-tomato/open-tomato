/**
 * A counting semaphore for limiting concurrent access to a shared resource.
 *
 * Used by the {@link WaveDispatcher} to cap the number of worker processes
 * running simultaneously during a wave dispatch.
 */
export class Semaphore {
  private permits: number;
  private readonly queue: Array<() => void> = [];

  /**
   * Create a new semaphore with the given number of permits.
   *
   * @param permits - Maximum number of concurrent acquisitions allowed.
   */
  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * Acquire a permit, decrementing the available count.
   *
   * Resolves immediately when a permit is available. When all permits are
   * held, the returned promise blocks until another caller invokes
   * {@link release}.
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  /**
   * Release a permit, unblocking the next queued caller if any.
   *
   * If callers are waiting in the queue, the oldest one is resolved.
   * Otherwise the available permit count is incremented.
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }

  /**
   * The number of permits currently available.
   *
   * Useful for observability and debugging. A value of `0` means all
   * permits are held and subsequent {@link acquire} calls will queue.
   */
  get available(): number {
    return this.permits;
  }
}

/**
 * Backend auto-detection — discovers which AI CLI backends are available
 * on the host by checking PATH resolution and running `--version` probes.
 *
 * Results are cached with a configurable TTL to avoid repeated subprocess
 * spawns within the same session.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheEntry {
  readonly available: boolean;
  readonly expiresAt: number;
}

interface BackendDetectorOptions {
  /** Cache TTL in milliseconds. Defaults to 60 000 (60 s). */
  readonly cacheTtlMs?: number;
}

// ---------------------------------------------------------------------------
// Subprocess abstraction (enables testing without real processes)
// ---------------------------------------------------------------------------

/**
 * Minimal interface for spawning a subprocess and awaiting its exit code.
 * Production code uses `Bun.spawn`; tests inject a stub.
 */
export interface SubprocessRunner {
  run(command: string, args: readonly string[]): Promise<{ exitCode: number }>;
}

const defaultRunner: SubprocessRunner = {
  async run(command, args) {
    const proc = Bun.spawn([command, ...args], {
      stdout: 'ignore',
      stderr: 'ignore',
    });
    const exitCode = await proc.exited;
    return { exitCode };
  },
};

// ---------------------------------------------------------------------------
// BackendDetector
// ---------------------------------------------------------------------------

/**
 * Discovers which AI CLI backends are available on the host by probing
 * each candidate command with `--version`. Results are cached with a
 * configurable TTL to avoid repeated subprocess spawns.
 */
export class BackendDetector {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;
  private readonly runner: SubprocessRunner;

  constructor(
    options: BackendDetectorOptions = {},
    runner: SubprocessRunner = defaultRunner,
  ) {
    this.cacheTtlMs = options.cacheTtlMs ?? 60_000;
    this.runner = runner;
  }

  /**
   * Checks each candidate command and returns the subset that is available.
   * Results are drawn from the TTL cache when fresh.
   */
  async detect(candidates: readonly string[]): Promise<string[]> {
    const results = await Promise.all(
      candidates.map(async (cmd) => ({
        command: cmd,
        available: await this.isAvailable(cmd),
      })),
    );

    return results
      .filter((r) => r.available)
      .map((r) => r.command);
  }

  /**
   * Returns true when `command --version` exits with code 0.
   * Cached per command for `cacheTtlMs` milliseconds.
   */
  async isAvailable(command: string): Promise<boolean> {
    const cached = this.cache.get(command);

    if (cached !== undefined && Date.now() < cached.expiresAt) {
      return cached.available;
    }

    const available = await this.probe(command);

    this.cache.set(command, {
      available,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return available;
  }

  /** Clears the entire availability cache. */
  clearCache(): void {
    this.cache.clear();
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private async probe(command: string): Promise<boolean> {
    try {
      const { exitCode } = await this.runner.run(command, ['--version']);
      return exitCode === 0;
    } catch {
      // Command not found or spawn failure → not available.
      return false;
    }
  }
}

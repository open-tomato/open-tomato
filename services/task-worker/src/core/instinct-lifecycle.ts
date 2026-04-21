/**
 * Instinct lifecycle hooks for the task-worker.
 *
 * - **Bootstrap**: On startup, pull the blessed instinct bundle from the
 *   orchestrator and import it (cold-start).
 * - **Flush**: On SIGTERM or after CLI exec, export personal instincts
 *   to the orchestrator before the worker shuts down.
 *
 * Follows the same injectable-deps pattern as `scripts/sync-agent.ts`
 * and `scripts/bootstrap-instincts.ts`. When the orchestrator URL is
 * absent, all operations are silently skipped (local-only mode).
 */

import { exec } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Injectable dependencies
// ---------------------------------------------------------------------------

export interface InstinctDeps {
  /** Run `instinct-cli.py --json` and return stdout (JSON array of instincts). */
  exportInstincts(): Promise<string>;
  /** POST instinct payload to the orchestrator sync endpoint. */
  postSync(url: string, body: string): Promise<{ ok: boolean; status: number }>;
  /** GET the blessed bundle from the orchestrator. */
  getBlessed(url: string): Promise<{ ok: boolean; text(): Promise<string> }>;
  /** Run `instinct-cli.py --import-blessed <path>` to import the blessed bundle. */
  importBlessed(path: string): Promise<string>;
}

export function defaultInstinctDeps(): InstinctDeps {
  return {
    async exportInstincts() {
      const { stdout } = await execAsync('python3 instinct-cli.py --json');
      return stdout;
    },
    async postSync(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      return { ok: res.ok, status: res.status };
    },
    async getBlessed(url) {
      return fetch(url);
    },
    async importBlessed(path) {
      const { stdout } = await execAsync(`python3 instinct-cli.py --import-blessed ${path}`);
      return stdout;
    },
  };
}

// ---------------------------------------------------------------------------
// Bootstrap (startup)
// ---------------------------------------------------------------------------

/**
 * Pulls the blessed instinct bundle from the orchestrator and imports it.
 * Silently skips if `orchestratorUrl` is absent or the orchestrator is
 * unreachable. Never throws — startup must not be blocked by instincts.
 */
export async function bootstrapInstincts(
  orchestratorUrl: string | undefined,
  workerId: string,
  deps: InstinctDeps = defaultInstinctDeps(),
): Promise<void> {
  if (!orchestratorUrl) return;

  try {
    const res = await deps.getBlessed(`${orchestratorUrl}/api/instincts/blessed`);
    if (!res.ok) return;

    const bundle = await res.text();
    const tmpDir = await mkdtemp(join(tmpdir(), 'instinct-bootstrap-'));
    const tmpFile = join(tmpDir, 'blessed.json');

    try {
      await writeFile(tmpFile, bundle, 'utf8');
      await deps.importBlessed(tmpFile);
      console.log(`[task-worker:${workerId}] instinct bootstrap: imported blessed bundle`);
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  } catch (err) {
    // Orchestrator unreachable — skip silently
    console.warn(
      `[task-worker:${workerId}] instinct bootstrap skipped:`,
      err instanceof Error
        ? err.message
        : err,
    );
  }
}

// ---------------------------------------------------------------------------
// Flush (shutdown)
// ---------------------------------------------------------------------------

/**
 * Exports personal instincts to the orchestrator. Called on SIGTERM or
 * after a CLI exec completes. Silently skips if the orchestrator is
 * absent or unreachable. Never throws — shutdown must not be blocked.
 */
export async function flushInstincts(
  orchestratorUrl: string | undefined,
  workerId: string,
  deps: InstinctDeps = defaultInstinctDeps(),
): Promise<void> {
  if (!orchestratorUrl) return;

  try {
    const instinctsJson = await deps.exportInstincts();
    if (!instinctsJson.trim()) return;

    const res = await deps.postSync(
      `${orchestratorUrl}/api/instincts/sync`,
      JSON.stringify({
        container_id: workerId,
        instincts: JSON.parse(instinctsJson),
      }),
    );

    if (res.ok) {
      console.log(`[task-worker:${workerId}] instinct flush: exported to orchestrator`);
    } else {
      console.warn(`[task-worker:${workerId}] instinct flush: orchestrator returned ${res.status}`);
    }
  } catch (err) {
    console.warn(
      `[task-worker:${workerId}] instinct flush skipped:`,
      err instanceof Error
        ? err.message
        : err,
    );
  }
}

// ---------------------------------------------------------------------------
// SIGTERM wiring
// ---------------------------------------------------------------------------

/**
 * Registers a SIGTERM handler that flushes instincts before exiting.
 * Call once at service startup.
 */
export function registerShutdownHook(
  orchestratorUrl: string | undefined,
  workerId: string,
  deps?: InstinctDeps,
): void {
  let flushing = false;

  process.on('SIGTERM', () => {
    if (flushing) return;
    flushing = true;

    console.log(`[task-worker:${workerId}] SIGTERM received — flushing instincts...`);

    flushInstincts(orchestratorUrl, workerId, deps)
      .finally(() => process.exit(0));
  });
}

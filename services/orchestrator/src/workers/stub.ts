/**
 * @packageDocumentation
 * Stub worker client — no-op implementation for DRY_RUN / simulator mode.
 *
 * `exec()` returns a process-like handle that immediately resolves with exit 0
 * and produces no output. Used as the default worker when running in simulation
 * mode so that the worker pool + dispatch flow works without a real backend.
 */

import type { WorkerClient, WorkerProcess } from './client.js';

import process from 'node:process';

/**
 * No-op worker client for simulation and dry-run modes.
 * All methods succeed immediately without doing any real work.
 */
export class StubWorkerClient implements WorkerClient {
  readonly workerId: string;

  constructor(workerId: string) {
    this.workerId = workerId;
  }

  async prepareWorkspace(): Promise<string> {
    // In stub mode, just return the current working directory
    return process.cwd();
  }

  async exec(): Promise<WorkerProcess> {
    // Return a process-like handle that resolves immediately with exit 0
    const empty = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });

    return {
      stdout: empty,
      stderr: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      }),
      exited: Promise.resolve(0),
      kill: () => {},
    };
  }

  async cleanWorkspace(): Promise<void> {
    // No-op
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

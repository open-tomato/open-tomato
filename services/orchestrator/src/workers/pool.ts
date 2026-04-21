/**
 * @packageDocumentation
 * Worker pool manager — tracks available workers, assigns jobs, manages health.
 *
 * The pool maintains an in-memory map of `workerId → WorkerClient` and syncs
 * status to the `workersTable` in the executor DB via `store/workers.ts`.
 */

import type { WorkerClient } from './client.js';
import type { Db } from '../db/index.js';

import { deleteWorker, setWorkerStatus, upsertWorker } from '../store/workers.js';

/**
 * Manages a pool of worker backends. Workers are registered at startup or
 * via the `PUT /workers/:workerId` API endpoint.
 */
export class WorkerPool {
  private readonly workers = new Map<string, WorkerClient>();
  private readonly busy = new Set<string>();
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Register a worker in the pool and persist it to the DB.
   *
   * @param client - The worker client to register.
   * @param address - Address or container ID for DB persistence.
   */
  async register(client: WorkerClient, address: string): Promise<void> {
    this.workers.set(client.workerId, client);
    await upsertWorker(this.db, {
      id: client.workerId,
      status: 'idle',
      address,
    });
  }

  /**
   * Remove a worker from the pool and DB.
   *
   * @param workerId - The worker to remove.
   */
  async unregister(workerId: string): Promise<void> {
    this.workers.delete(workerId);
    this.busy.delete(workerId);
    await deleteWorker(this.db, workerId);
  }

  /**
   * Claim an idle worker for a job. Returns `null` if no idle workers exist.
   * The worker is marked as busy both in-memory and in the DB.
   */
  async claimIdle(): Promise<WorkerClient | null> {
    for (const [id, client] of this.workers) {
      if (!this.busy.has(id)) {
        this.busy.add(id);
        await setWorkerStatus(this.db, id, 'busy');
        return client;
      }
    }
    return null;
  }

  /**
   * Release a worker back to the idle pool after a job completes.
   *
   * @param workerId - The worker to release.
   */
  async release(workerId: string): Promise<void> {
    this.busy.delete(workerId);
    if (this.workers.has(workerId)) {
      await setWorkerStatus(this.db, workerId, 'idle');
    }
  }

  /**
   * Run a health check on all registered workers. Unhealthy workers are
   * marked as `error` in the DB but not removed from the pool.
   */
  async healthCheckAll(): Promise<void> {
    for (const [id, client] of this.workers) {
      const healthy = await client.isHealthy();
      if (!healthy) {
        await setWorkerStatus(this.db, id, 'error');
      }
    }
  }

  /** Returns the number of registered workers. */
  get size(): number {
    return this.workers.size;
  }

  /** Returns the number of idle (non-busy) workers. */
  get idleCount(): number {
    return this.workers.size - this.busy.size;
  }

  /** Returns true if the given worker is registered. */
  has(workerId: string): boolean {
    return this.workers.has(workerId);
  }

  /** Returns the worker client for a given ID, or undefined. */
  get(workerId: string): WorkerClient | undefined {
    return this.workers.get(workerId);
  }
}

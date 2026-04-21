/**
 * @packageDocumentation
 * HTTP worker client — communicates with a worker pod/container over HTTP.
 *
 * @deprecated Use {@link TaskWorkerHttpClient} from
 * `./task-worker-http-client.js` instead. This stub is kept for backward
 * compatibility with `PUT /workers/:workerId` registrations using
 * `type: 'http'`. New code should use `type: 'task-worker'`.
 */

import type { WorkerClient, WorkerProcess } from './client.js';

/**
 * Worker client that communicates with a remote worker over HTTP.
 * The worker exposes `POST /exec`, `POST /workspace`, `DELETE /workspace`,
 * and `GET /health` endpoints.
 *
 * @throws {Error} All methods throw NotImplementedError until Scenario B/C is implemented.
 */
export class HttpWorkerClient implements WorkerClient {
  readonly workerId: string;
  private readonly baseUrl: string;

  constructor(workerId: string, baseUrl: string) {
    this.workerId = workerId;
    this.baseUrl = baseUrl;
  }

  async prepareWorkspace(): Promise<string> {
    throw new Error(`HttpWorkerClient.prepareWorkspace not implemented (worker: ${this.workerId}, url: ${this.baseUrl})`);
  }

  async exec(): Promise<WorkerProcess> {
    throw new Error(`HttpWorkerClient.exec not implemented (worker: ${this.workerId}, url: ${this.baseUrl})`);
  }

  async cleanWorkspace(): Promise<void> {
    throw new Error(`HttpWorkerClient.cleanWorkspace not implemented (worker: ${this.workerId}, url: ${this.baseUrl})`);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

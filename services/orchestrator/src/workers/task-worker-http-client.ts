/**
 * HTTP worker client for remote/docker task-worker instances.
 *
 * Implements `WorkerClient` by calling the task-worker HTTP API:
 *   POST /workspace  — prepare workspace
 *   POST /exec       — spawn Claude CLI, receive SSE stream
 *   DELETE /workspace — clean up
 *   GET /health      — status check
 *
 * Replaces the stub `HttpWorkerClient` for production use with the
 * new task-worker service.
 */

import type { ExecOptions, WorkerClient, WorkerProcess } from './client.js';
import type {
  HealthResponse,
  WorkspaceResponse,
} from '@open-tomato/worker-protocol';

import { sseToWorkerProcess } from './sse-to-worker-process.js';

export class TaskWorkerHttpClient implements WorkerClient {
  readonly workerId: string;
  private readonly baseUrl: string;

  constructor(workerId: string, baseUrl: string) {
    this.workerId = workerId;
    this.baseUrl = baseUrl;
  }

  async prepareWorkspace(branch: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/workspace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `TaskWorkerHttpClient.prepareWorkspace failed (${res.status}): ${body}`,
      );
    }

    const data = (await res.json()) as WorkspaceResponse;
    return data.workDir;
  }

  async exec(
    prompt: string,
    workDir: string,
    options?: ExecOptions,
  ): Promise<WorkerProcess> {
    const abortController = new AbortController();

    // Build request body
    const body: Record<string, string> = { prompt, workDir };
    if (options?.backendOverride && typeof options.backendOverride === 'string') {
      body['model'] = options.backendOverride;
    }

    const res = await fetch(`${this.baseUrl}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `TaskWorkerHttpClient: the invocation failed (${res.status}): ${errorBody}`,
      );
    }

    if (!res.body) {
      throw new Error('TaskWorkerHttpClient: response has no body');
    }

    return sseToWorkerProcess(res.body, abortController);
  }

  async cleanWorkspace(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/workspace`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `TaskWorkerHttpClient.cleanWorkspace failed (${res.status}): ${body}`,
      );
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (!res.ok) return false;

      const data = (await res.json()) as HealthResponse;
      return data.status === 'idle' || data.status === 'busy';
    } catch {
      return false;
    }
  }
}

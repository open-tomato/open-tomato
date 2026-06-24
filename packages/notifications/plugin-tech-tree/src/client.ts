import type {
  ApprovalDecision,
  CloseCallback,
  CurrentTaskResponse,
  DispatchRequest,
  DispatchResult,
  EventCallback,
  EventSubscription,
  JobRecord,
  JobStatus,
  PendingApproval,
  StoredEvent,
  WorkerListResponse,
} from './types.js';

/**
 * Options for constructing a {@link TechTreeNotificationClient}.
 *
 * Post-refactoring the client routes requests to two services:
 * - **notifications** — SSE feed, approvals, event history
 * - **executor** — jobs, workers, dispatch, pause/resume
 */
export interface TechTreeClientOptions {
  /** Base URL of the notifications service (SSE, approvals, event history). */
  notificationUrl: string;
  /** Base URL of the executor service (jobs, workers, dispatch). */
  executorUrl: string;
}

/**
 * Typed HTTP/SSE client used by `apps/tech-tree` to talk to
 * `services/notifications` and `services/executor`.
 *
 * This package lives on the consumer side (tech-tree). It provides:
 * - `subscribeToFeed()` — SSE subscription for real-time activity stream (→ notifications)
 * - `getPendingApprovals()` — poll or initial load of the approval inbox (→ notifications)
 * - `submitDecision()` — grant or deny a pending approval (→ notifications)
 * - `getEventHistory()` — recent stored events (→ notifications)
 * - `listWorkers()` / `getJob()` / `getActiveJobs()` — executor state (→ executor)
 * - `pauseJob()` / `resumeJob()` — job lifecycle (→ executor)
 * - `dispatchJob()` — dispatch a plan (→ executor)
 */
export class TechTreeNotificationClient {
  private readonly notificationUrl: string;
  private readonly executorUrl: string;

  /**
   * @param urlOrOpts - Either a single URL string (deprecated — uses it for both
   *   notifications and executor) or a {@link TechTreeClientOptions} with separate URLs.
   */
  constructor(urlOrOpts: string | TechTreeClientOptions) {
    if (typeof urlOrOpts === 'string') {
      // Backward-compatible: single URL used for both services
      this.notificationUrl = urlOrOpts;
      this.executorUrl = urlOrOpts;
    } else {
      this.notificationUrl = urlOrOpts.notificationUrl;
      this.executorUrl = urlOrOpts.executorUrl;
    }
  }

  // ── Activity stream (→ notifications) ───────────────────────────────────

  /**
   * Opens an SSE connection to the event feed for a given job.
   * The notification service replays recent history before streaming live.
   *
   * @param entityKind  The entity kind (e.g. 'executor')
   * @param jobId       The job to subscribe to
   * @param onEvent     Called for each parsed event
   * @param onClose     Called when the connection closes or errors
   * @returns           A subscription handle with a `close()` method
   */
  subscribeToFeed(
    entityKind: string,
    jobId: string,
    onEvent: EventCallback,
    onClose?: CloseCallback,
  ): EventSubscription {
    const url = `${this.notificationUrl}/events/${entityKind}/${jobId}`;
    const controller = new AbortController();

    // Start the async SSE reader in the background
    void this.readEventStream(url, controller.signal, onEvent, onClose);

    return {
      close() {
        controller.abort();
      },
    };
  }

  /**
   * Internal SSE reader loop. Parses `data:` lines from the stream.
   */
  private async readEventStream(
    url: string,
    signal: AbortSignal,
    onEvent: EventCallback,
    onClose?: CloseCallback,
  ): Promise<void> {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: 'text/event-stream' },
        signal,
      });
    } catch (err) {
      if (signal.aborted) return;
      onClose?.(err instanceof Error
        ? err.message
        : String(err));
      return;
    }

    if (!res.ok || !res.body) {
      onClose?.(`HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (payload && payload !== '[HEARTBEAT]') {
              try {
                onEvent(JSON.parse(payload) as StoredEvent);
              } catch {
                // malformed — skip
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!signal.aborted) {
      onClose?.('stream ended');
    }
  }

  // ── Approval inbox (→ notifications) ───────────────────────────────────

  /**
   * Fetch all pending approvals, optionally filtered by jobId.
   */
  async getPendingApprovals(jobId?: string): Promise<PendingApproval[]> {
    const params = new URLSearchParams({ pending: 'true' });
    if (jobId) params.set('jobId', jobId);

    const res = await fetch(`${this.notificationUrl}/approvals?${params.toString()}`);
    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] getPendingApprovals failed: HTTP ${res.status}`,
      );
    }
    return res.json() as Promise<PendingApproval[]>;
  }

  /**
   * Submit a grant or deny decision for a pending approval.
   */
  async submitDecision(
    requestId: string,
    decision: ApprovalDecision,
  ): Promise<void> {
    const res = await fetch(
      `${this.notificationUrl}/approvals/${requestId}/decide`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision),
      },
    );

    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] submitDecision failed: HTTP ${res.status}`,
      );
    }
  }

  // ── Recent events (→ notifications) ────────────────────────────────────

  /**
   * Fetch recent stored events for a job (non-streaming, HTTP GET).
   * Useful for initial page load / history replay without SSE.
   */
  async getEventHistory(
    entityKind: string,
    jobId: string,
  ): Promise<StoredEvent[]> {
    const res = await fetch(
      `${this.notificationUrl}/events/${entityKind}/${jobId}/history`,
    );
    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] getEventHistory failed: HTTP ${res.status}`,
      );
    }
    return res.json() as Promise<StoredEvent[]>;
  }

  // ── Workers (→ executor) ───────────────────────────────────────────────

  /**
   * List all registered workers in the executor's pool.
   */
  async listWorkers(): Promise<WorkerListResponse> {
    const res = await fetch(`${this.executorUrl}/workers`);
    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] listWorkers failed: HTTP ${res.status}`,
      );
    }
    return res.json() as Promise<WorkerListResponse>;
  }

  // ── Jobs (→ executor) ──────────────────────────────────────────────────

  /**
   * Fetch the current state of a specific job.
   */
  async getJob(jobId: string): Promise<JobRecord> {
    const res = await fetch(`${this.executorUrl}/jobs/${jobId}`);
    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] getJob failed: HTTP ${res.status}`,
      );
    }
    return res.json() as Promise<JobRecord>;
  }

  /**
   * Returns jobs filtered by status.
   * Defaults to `['running', 'paused']` when no statuses are provided.
   *
   * @param statuses - Optional list of job statuses to filter by.
   */
  async getActiveJobs(statuses?: JobStatus[]): Promise<JobRecord[]> {
    const filter = statuses ?? ['running', 'paused'];
    const params = new URLSearchParams({ status: filter.join(',') });

    const res = await fetch(`${this.executorUrl}/jobs?${params.toString()}`);
    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] getActiveJobs failed: HTTP ${res.status}`,
      );
    }
    return res.json() as Promise<JobRecord[]>;
  }

  /**
   * Returns the currently running task for a job, including its last event.
   * Returns `{ task: null }` when the job has no running task (completed/idle).
   *
   * @param jobId - The job UUID.
   */
  async getJobCurrentTask(jobId: string): Promise<CurrentTaskResponse> {
    const res = await fetch(`${this.executorUrl}/jobs/${jobId}/current-task`);
    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] getJobCurrentTask failed: HTTP ${res.status}`,
      );
    }
    return res.json() as Promise<CurrentTaskResponse>;
  }

  /**
   * Sends a pause request to the executor for a job.
   *
   * @param jobId - The job UUID.
   */
  async pauseJob(jobId: string): Promise<void> {
    const res = await fetch(`${this.executorUrl}/jobs/${jobId}/pause`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] pauseJob failed: HTTP ${res.status}`,
      );
    }
  }

  /**
   * Sends a resume request to the executor for a job.
   *
   * @param jobId - The job UUID.
   */
  async resumeJob(jobId: string): Promise<void> {
    const res = await fetch(`${this.executorUrl}/jobs/${jobId}/resume`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(
        `[notifications-plugin-tech-tree] resumeJob failed: HTTP ${res.status}`,
      );
    }
  }

  // ── Job dispatch (→ executor) ──────────────────────────────────────────

  /**
   * Dispatch a plan to the executor via POST /jobs.
   *
   * The executor claims an idle worker from its pool. Returns 503 when
   * no idle workers are available.
   */
  async dispatchJob(request: DispatchRequest): Promise<DispatchResult> {
    const res = await fetch(`${this.executorUrl}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (res.status === 503) {
      const body = await res.json() as { error: string };
      throw new Error(
        body.error === 'No idle workers available'
          ? 'No idle workers available. Register a worker via PUT /workers/:workerId.'
          : `[notifications-plugin-tech-tree] dispatch failed: ${body.error}`,
      );
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `[notifications-plugin-tech-tree] dispatchJob failed: HTTP ${res.status} — ${body}`,
      );
    }

    return res.json() as Promise<DispatchResult>;
  }
}

/**
 * Factory. Accepts separate URLs for notifications and executor services.
 *
 * @param notificationUrl - Base URL of the notifications service.
 * @param executorUrl - Base URL of the executor service.
 */
export function createTechTreeNotificationClient(
  notificationUrl: string | undefined,
  executorUrl?: string | undefined,
): TechTreeNotificationClient {
  if (!notificationUrl) {
    throw new Error(
      '[notifications-plugin-tech-tree] NOTIFICATION_URL is required',
    );
  }
  // When executorUrl is not provided, fall back to notificationUrl (backward compat)
  return new TechTreeNotificationClient({
    notificationUrl,
    executorUrl: executorUrl ?? notificationUrl,
  });
}

import type { ApprovalDecision, ApprovalRequest, ExecutorEvent } from '../types.js';

/**
 * Contract for emitting activity events and requesting human approvals.
 *
 * Two implementations are provided:
 * - `StubNotificationClient` — for local dev / when NOTIFICATION_URL is unset.
 *   Logs events to console and auto-grants all approvals.
 * - `HttpNotificationClient` — wires to `services/notifications` over HTTP/SSE.
 */
export interface NotificationClient {
  /**
   * Emits an executor event to the notification service.
   *
   * Returns `{ taskId }` when the event was `task.started` and the notification
   * service successfully created a task record. The task ID must be forwarded in
   * all subsequent events for that task (task.done, task.failed, task.blocked).
   * For all other event types, `taskId` is `undefined`.
   */
  emitEvent(jobId: string, nodeId: string, event: ExecutorEvent): Promise<{ taskId?: string }>;
  requestApproval(
    jobId: string,
    nodeId: string,
    request: ApprovalRequest,
  ): Promise<ApprovalDecision>;
}

// ---------------------------------------------------------------------------
// Stub implementation (no external dependency)
// ---------------------------------------------------------------------------

export class StubNotificationClient implements NotificationClient {
  async emitEvent(jobId: string, nodeId: string, event: ExecutorEvent): Promise<{ taskId?: string }> {
    console.log(JSON.stringify({ level: 'info', jobId, nodeId, ...event }));
    return {};
  }

  async requestApproval(
    _jobId: string,
    _nodeId: string,
    request: ApprovalRequest,
  ): Promise<ApprovalDecision> {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: '[stub-approval] auto-granting approval request',
        description: request.description,
        type: request.type,
      }),
    );
    return { decision: 'granted' };
  }
}

// ---------------------------------------------------------------------------
// HTTP implementation (wires to services/notifications)
// ---------------------------------------------------------------------------

export class HttpNotificationClient implements NotificationClient {
  constructor(private readonly baseUrl: string) {}

  async emitEvent(jobId: string, nodeId: string, event: ExecutorEvent): Promise<{ taskId?: string }> {
    const res = await fetch(`${this.baseUrl}/events/executor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, nodeId, ...event }),
    });

    if (!res.ok) return {};

    try {
      const body = await res.json() as { taskId?: string };
      return { taskId: body.taskId };
    } catch {
      return {};
    }
  }

  async requestApproval(
    jobId: string,
    nodeId: string,
    request: ApprovalRequest,
  ): Promise<ApprovalDecision> {
    // 1. Register the approval request with the notification service
    await fetch(`${this.baseUrl}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, nodeId, entityKind: 'executor', ...request }),
    });

    // 2. Block until a human grants or denies via SSE long-poll
    const res = await fetch(`${this.baseUrl}/approvals/${request.requestId}/wait`);

    if (!res.ok) {
      console.error(
        `[notification] approval wait failed: ${res.status} — treating as denied`,
      );
      return { decision: 'denied', note: `HTTP ${res.status} from notification service` };
    }

    return res.json() as Promise<ApprovalDecision>;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns an `HttpNotificationClient` when `notificationUrl` is provided,
 * otherwise falls back to the `StubNotificationClient`.
 */
export function createNotificationClient(notificationUrl?: string): NotificationClient {
  if (notificationUrl) {
    return new HttpNotificationClient(notificationUrl);
  }
  return new StubNotificationClient();
}

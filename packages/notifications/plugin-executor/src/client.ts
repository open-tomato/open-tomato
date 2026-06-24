import type { ApprovalDecision, ApprovalRequest, ExecutorEvent } from './types.js';

/**
 * Typed HTTP client used by `services/executor` to talk to `services/notifications`.
 *
 * Wraps the raw fetch calls so the executor never deals with paths or
 * SSE framing directly. This package is the inbound plugin — it lives on
 * the producer side (executor node) and points outward at the notification hub.
 *
 * Convention: `notifications-plugin-*` packages sit on the consumer/producer
 * side and provide the typed surface. The notification service itself owns
 * the wire protocol.
 */
export class ExecutorNotificationClient {
  constructor(
    private readonly baseUrl: string,
    private readonly nodeId: string,
  ) {}

  /**
   * Emit an executor event to the notification service.
   * Fire-and-forget: callers do not need to await unless they want
   * to handle network errors explicitly.
   */
  async emitEvent(jobId: string, event: ExecutorEvent): Promise<void> {
    await fetch(`${this.baseUrl}/events/executor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, nodeId: this.nodeId, ...event }),
    });
  }

  /**
   * Register an approval request and block until a human grants or denies it.
   *
   * 1. POSTs the approval request to create it in the store.
   * 2. Opens an SSE connection to /approvals/:requestId/wait.
   * 3. Returns the first decision event received.
   *
   * If the SSE connection drops before a decision, this throws.
   */
  async requestApproval(jobId: string, request: ApprovalRequest): Promise<ApprovalDecision> {
    // 1. Register
    await fetch(`${this.baseUrl}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        nodeId: this.nodeId,
        entityKind: 'executor',
        ...request,
      }),
    });

    // 2. Wait for decision via SSE
    return this.waitForApproval(request.requestId);
  }

  /**
   * Long-polls the notification service until an approval decision arrives.
   * Uses the SSE endpoint and reads the first `data:` line.
   */
  async waitForApproval(requestId: string): Promise<ApprovalDecision> {
    const res = await fetch(`${this.baseUrl}/approvals/${requestId}/wait`, {
      headers: { Accept: 'text/event-stream' },
    });

    if (!res.ok || !res.body) {
      throw new Error(`[notifications-plugin-executor] approval wait failed: HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (payload && payload !== '') {
              return JSON.parse(payload) as ApprovalDecision;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    throw new Error('[notifications-plugin-executor] approval wait stream ended without decision');
  }
}

/**
 * Factory. Returns `null` when `notificationUrl` is not configured —
 * callers fall back to local stub behaviour.
 */
export function createExecutorNotificationClient(
  notificationUrl: string | undefined,
  nodeId: string,
): ExecutorNotificationClient | null {
  return notificationUrl
    ? new ExecutorNotificationClient(notificationUrl, nodeId)
    : null;
}

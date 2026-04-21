/**
 * @packageDocumentation
 * SSE subscriber that connects to the notification service to receive
 * real-time executor job events.
 */

export interface JobEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface Subscription {
  close(): void;
}

type EventCallback = (event: JobEvent) => void;

const RELEVANT_EVENTS = new Set([
  'loop.done',
  'loop.cancelled',
  'task.started',
  'task.done',
  'task.failed',
  'prerequisite.check',
]);

/**
 * Subscribes to SSE events for a specific executor job.
 *
 * When `notificationUrl` is absent, logs a warning and returns a no-op
 * subscription (same pattern as the executor service).
 */
export function subscribeToJob(
  notificationUrl: string | undefined,
  jobId: string,
  onEvent: EventCallback,
): Subscription {
  if (!notificationUrl) {
    console.warn('[schedulus] NOTIFICATION_URL not set — skipping SSE subscription');
    return { close() { /* no-op */ } };
  }

  const url = `${notificationUrl}/events/executor/${jobId}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data as string) as Record<string, unknown>;
      const eventType = parsed['type'] as string | undefined;

      if (eventType && RELEVANT_EVENTS.has(eventType)) {
        onEvent({ type: eventType, data: parsed });
      }
    } catch {
      // Malformed SSE data — skip silently
    }
  };

  eventSource.onerror = () => {
    // EventSource reconnects automatically; nothing to do here
  };

  return {
    close() {
      eventSource.close();
    },
  };
}

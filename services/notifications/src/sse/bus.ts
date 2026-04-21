/**
 * @packageDocumentation
 * In-process SSE fan-out bus for the Notifications Hub.
 */
import type { Response } from 'express';

import { EventEmitter } from 'events';

/**
 * In-process SSE fan-out bus.
 *
 * Two independent channels:
 * - **events** keyed by jobId — streams activity events to tech-tree consumers
 * - **approvals** keyed by requestId — one-shot resolution signal for executor wait
 *
 * Both channels emit raw JSON strings. Consumers are responsible for wrapping
 * in the SSE `data: ...\n\n` envelope.
 */
class SseBus extends EventEmitter {
  constructor() {
    super();
    // Allow many concurrent SSE subscribers (one per active job stream + approval wait)
    this.setMaxListeners(500);
  }

  /** Publish an activity event to all subscribers watching this job. */
  publishEvent(jobId: string, payload: unknown): void {
    this.emit(`events:${jobId}`, JSON.stringify(payload));
  }

  /** Resolve the approval wait for a specific requestId. */
  publishApprovalDecision(requestId: string, payload: unknown): void {
    this.emit(`approval:${requestId}`, JSON.stringify(payload));
  }

  /**
   * Attach an SSE response to the event stream for a job.
   * Replays historical events from `history`, then streams live events.
   * Sends a heartbeat every 15 s to keep the connection alive.
   * Cleans up on client disconnect.
   */
  attachEventStream(
    res: Response,
    jobId: string,
    history: unknown[],
  ): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    // Replay history first
    for (const event of history) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    const onEvent = (data: string) => res.write(`data: ${data}\n\n`);
    this.on(`events:${jobId}`, onEvent);

    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000);

    res.on('close', () => {
      this.off(`events:${jobId}`, onEvent);
      clearInterval(heartbeat);
    });
  }

  /**
   * Attach an SSE response that resolves once a human approves/denies.
   * The response is closed immediately after the decision arrives.
   */
  attachApprovalWait(res: Response, requestId: string): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000);

    const onDecision = (data: string) => {
      res.write(`data: ${data}\n\n`);
      clearInterval(heartbeat);
      res.end();
    };

    this.once(`approval:${requestId}`, onDecision);

    res.on('close', () => {
      this.off(`approval:${requestId}`, onDecision);
      clearInterval(heartbeat);
    });
  }
}

export const sseBus = new SseBus();
